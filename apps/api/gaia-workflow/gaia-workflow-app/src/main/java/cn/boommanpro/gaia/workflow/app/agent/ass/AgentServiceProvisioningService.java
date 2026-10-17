package cn.boommanpro.gaia.workflow.app.agent.ass;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.runtime.SystemPromptResolver;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.service.AgentProviderConfigService;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * AgentScope Service 托管 Agent 自动同步 —— 每个本地会话在 Service 侧对应一个
 * 专属 Managed Agent（带会话级 MCP 端点），免去手工建 Agent 与抄录工具 schema。
 *
 * <p><b>为什么按会话建 Agent</b>：Session 创建时冻结 Agent 定义快照，而托管 Agent 的
 * 工具来自 MCP —— 数据面按定义里的 MCP URL 主动回连 Gaia。把 Gaia 会话键编进
 * MCP URL（{@code /mcp/gaia/{sessionKey}}），数据面的每次工具调用就能确定性路由回
 * 本地会话（草稿/上下文/前端事件通道），无需时序猜测。</p>
 *
 * <p>映射状态存配置中心（{@code agent_config}，key={@code as_provisioning:{definitionId}:{sessionKey}}，
 * config_data={agentId, payloadHash}）：</p>
 * <ul>
 *   <li><b>首次运行</b>：无映射 → {@code POST /api/v1/agents} 创建（binding=managed）</li>
 *   <li><b>定义变更</b>：payload hash 变化 → 读当前 version 乐观锁 {@code PATCH .../definition}</li>
 *   <li><b>无变更</b>：hash 相同 → 零远端调用</li>
 * </ul>
 */
@Slf4j
@Service
public class AgentServiceProvisioningService {

    public static final String PROVISIONING_KEY_PREFIX = "as_provisioning:";
    public static final String PROVISIONING_CONFIG_TYPE = "as_provisioning";
    public static final String MCP_SERVER_NAME = "gaia";

    private static final String FALLBACK_SYSTEM =
        "你是 Gaia 工作流平台的智能助手，通过 MCP 工具查询与操作工作流，回答使用中文。";
    /** agentKey 命名约束：字母/数字/连字符（对齐 Service 侧唯一键约束） */
    private static final int AGENT_KEY_MAX_LEN = 80;

    private final AgentServiceAdminClient adminClient;
    private final AgentProviderConfigService providerConfigService;
    private final AgentConfigService configService;
    private final AgentToolRegistry toolRegistry;
    private final ToolExecutorRegistry toolExecutorRegistry;
    private final SystemPromptResolver promptResolver;

    public AgentServiceProvisioningService(AgentServiceAdminClient adminClient,
                                           AgentProviderConfigService providerConfigService,
                                           AgentConfigService configService,
                                           AgentToolRegistry toolRegistry,
                                           ToolExecutorRegistry toolExecutorRegistry,
                                           SystemPromptResolver promptResolver) {
        this.adminClient = adminClient;
        this.providerConfigService = providerConfigService;
        this.configService = configService;
        this.toolRegistry = toolRegistry;
        this.toolExecutorRegistry = toolExecutorRegistry;
        this.promptResolver = promptResolver;
    }

    /** 同步结果 */
    @lombok.Data
    public static class ProvisionedAgent {
        private String agentId;
        private boolean created;
        private boolean updated;
    }

    /**
     * 确保本地会话在 Service 侧有专属托管 Agent，返回 agentId。
     * 远端调用失败原样向上抛（引擎转为运行错误）。
     *
     * @param definition 本地 Agent 定义（提供工具名单 / 提示词来源）
     * @param sessionKey 本地会话键（编入 MCP URL 与 agentKey）
     * @param locale     会话语言（经 MCP URL 查询参数带给工具执行）
     */
    public ProvisionedAgent ensureSessionAgent(AgentDefinition definition, String sessionKey, String locale) {
        AgentProviderConfigService.AsServiceConfig cfg = providerConfigService.getAsServiceConfig();
        String mcpUrl = cfg.getMcpPublicUrl() + "/mcp/gaia/" + sessionKey;
        JSONObject payload = buildDefinitionPayload(definition, cfg, mcpUrl, locale);
        String payloadHash = sha256(payload.toString());
        String configKey = PROVISIONING_KEY_PREFIX + definition.getId() + ":" + sessionKey;
        JSONObject state = loadState(configKey);

        if (state != null && payloadHash.equals(state.getStr("payloadHash"))
            && state.getStr("agentId") != null && !state.getStr("agentId").isEmpty()) {
            ProvisionedAgent unchanged = new ProvisionedAgent();
            unchanged.setAgentId(state.getStr("agentId"));
            return unchanged;
        }

        if (state == null || state.getStr("agentId") == null || state.getStr("agentId").isEmpty()) {
            JSONObject createBody = new JSONObject()
                .set("agentKey", agentKeyFor(sessionKey))
                .set("displayName", "Gaia · " + definition.getName() + " · " + shorten(sessionKey))
                .set("description", "Gaia as-service 引擎按会话自动创建（definition=" + definition.getId() + "）")
                .set("binding", new JSONObject().set("kind", "managed"))
                .set("definition", payload);
            JSONObject created = adminClient.createAgent(cfg, createBody.toString());
            String agentId = created.getJSONObject("agent") != null
                ? created.getJSONObject("agent").getStr("id") : created.getStr("id");
            ProvisionedAgent result = new ProvisionedAgent();
            result.setAgentId(agentId);
            result.setCreated(true);
            saveState(configKey, agentId, payloadHash);
            log.info("[ass-provision] 会话 {} 已创建 Service 托管 Agent {}（definition={}）",
                sessionKey, agentId, definition.getId());
            return result;
        }

        // 定义变更：乐观锁 PATCH
        String agentId = state.getStr("agentId");
        JSONObject current = adminClient.getDefinition(cfg, agentId);
        Integer version = current.getInt("version");
        if (version == null) {
            version = 1;
        }
        JSONObject patchBody = new JSONObject(payload);
        patchBody.set("version", version);
        adminClient.patchDefinition(cfg, agentId, patchBody.toString());
        ProvisionedAgent result = new ProvisionedAgent();
        result.setAgentId(agentId);
        result.setUpdated(true);
        saveState(configKey, agentId, payloadHash);
        log.info("[ass-provision] 会话 {} 定义变更已同步（agent={}）", sessionKey, agentId);
        return result;
    }

    // ---------------- payload 构建 ----------------

    /**
     * 本地定义 → Service 托管 definition。
     * model 走 ModelRegistry 字符串（默认 dashscope:*，配合 dataplane 的
     * DASHSCOPE_BASE_URL/DASHSCOPE_API_KEY 指向自定义端点）；
     * 工具 = 单个 gaia MCP 工具集（会话级 URL，always_allow 免 HITL 确认），
     * enableTools 限定为定义声明且后端可执行的工具名单。
     */
    JSONObject buildDefinitionPayload(AgentDefinition definition,
                                      AgentProviderConfigService.AsServiceConfig cfg,
                                      String mcpUrl, String locale) {
        String system = FALLBACK_SYSTEM;
        try {
            String resolved = promptResolver.resolve(definition, locale != null ? locale : "zh-CN");
            if (resolved != null && !resolved.trim().isEmpty()) {
                system = resolved;
            }
        } catch (Exception e) {
            log.warn("[ass-provision] 解析 system 提示词失败，使用兜底: {}", e.getMessage());
        }

        JSONArray enableTools = new JSONArray();
        JSONArray allSchemas = toolRegistry.getToolsSchema();
        for (int i = 0; i < allSchemas.size(); i++) {
            JSONObject tool = allSchemas.getJSONObject(i);
            JSONObject function = tool.getJSONObject("function");
            if (function == null) {
                continue;
            }
            String name = function.getStr("name");
            if (definition.getToolNames() != null && !definition.getToolNames().isEmpty()
                && !definition.getToolNames().contains(name)) {
                continue;
            }
            if (!toolExecutorRegistry.isBackendExecutable(name)) {
                continue;
            }
            enableTools.add(name);
        }

        JSONObject mcpServer = new JSONObject()
            .set("name", MCP_SERVER_NAME)
            .set("transport", "http")
            .set("url", mcpUrl)
            .set("queryParams", new JSONObject().set("locale", locale != null ? locale : "zh-CN"));
        JSONArray mcpServers = new JSONArray();
        mcpServers.add(mcpServer);
        JSONObject mcpToolset = new JSONObject()
            .set("type", "mcp_toolset")
            .set("mcpServerName", MCP_SERVER_NAME)
            // MCP 工具集默认 always_ask（HITL 确认）——本地评估改为直接放行，
            // 权限边界由 MCP 端点自身（回连地址仅限本机部署）承担
            .set("defaultConfig", new JSONObject()
                .set("permissionPolicy", new JSONObject().set("type", "always_allow")));
        JSONArray tools = new JSONArray();
        tools.add(mcpToolset);

        JSONObject payload = new JSONObject()
            .set("name", "gaia-" + shorten(definition.getId()))
            .set("description", definition.getDescription() != null && !definition.getDescription().isEmpty()
                ? definition.getDescription() : ("Gaia Agent: " + definition.getId()))
            .set("system", system)
            .set("model", cfg.getModel())
            // 对齐本地引擎的运行空间：复杂工作流构建（含护栏打断的修正重试）需要富余迭代数；
            // 复读循环由 Gaia 侧同参熔断护栏兜底，不依赖此处上限
            .set("maxIters", 40)
            .set("mcpServers", mcpServers)
            .set("tools", tools);
        if (!enableTools.isEmpty()) {
            mcpToolset.set("enableTools", enableTools);
        }
        return payload;
    }

    // ---------------- 状态存取 ----------------

    private String agentKeyFor(String sessionKey) {
        String sanitized = sessionKey.replaceAll("[^A-Za-z0-9_-]", "-");
        String key = "gaia-sess-" + sanitized;
        return key.length() > AGENT_KEY_MAX_LEN
            ? key.substring(0, AGENT_KEY_MAX_LEN) : key;
    }

    private String shorten(String text) {
        return text != null && text.length() > 24 ? text.substring(0, 24) : text;
    }

    private JSONObject loadState(String configKey) {
        AgentConfig config = configService.getOne(
            new QueryWrapper<AgentConfig>().eq("config_key", configKey));
        if (config == null || config.getConfigData() == null || config.getConfigData().isEmpty()) {
            return null;
        }
        try {
            return JSONUtil.parseObj(config.getConfigData());
        } catch (Exception e) {
            log.warn("[ass-provision] 解析映射状态失败（视为未同步）: {}", e.getMessage());
            return null;
        }
    }

    private void saveState(String configKey, String agentId, String payloadHash) {
        try {
            JSONObject data = new JSONObject()
                .set("agentId", agentId)
                .set("payloadHash", payloadHash);
            AgentConfig config = configService.getOne(
                new QueryWrapper<AgentConfig>().eq("config_key", configKey));
            AgentConfig entity = config != null ? config : new AgentConfig();
            entity.setConfigKey(configKey);
            entity.setConfigType(PROVISIONING_CONFIG_TYPE);
            entity.setTitle("AgentScope Service 会话 Agent 映射（" + configKey.substring(PROVISIONING_KEY_PREFIX.length()) + "）");
            entity.setConfigData(data.toString());
            entity.setDescription("由 AgentServiceProvisioningService 维护，请勿手工编辑");
            if (config != null) {
                configService.updateById(entity);
            } else {
                configService.save(entity);
            }
        } catch (Exception e) {
            log.error("[ass-provision] 保存映射状态失败 {}: {}", configKey, e.getMessage());
        }
    }

    private static String sha256(String text) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(text.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return String.valueOf(text.hashCode());
        }
    }
}
