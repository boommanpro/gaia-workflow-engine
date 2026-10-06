package cn.boommanpro.gaia.workflow.app.agent.ark;

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
 * 方舟 Agent 自动同步 —— 把本地 {@link AgentDefinition} 维护为远端方舟 Agent 资源，
 * 免去「在方舟控制台手动创建 Agent、逐个抄录 Custom Tool schema」的流程。
 *
 * <p>方舟 Agent 是版本化资源：创建返回 version=1；更新必须携带当前 version（乐观锁），
 * 成功后生成新版本。本服务把映射状态存进配置中心
 * （{@code agent_config}，key={@code ark_provisioning:{definitionId}}，config_data=
 * {@code {agentId, version, payloadHash}}）：</p>
 * <ul>
 *   <li><b>手动绑定优先</b>：definition.arkAgentId 已填 → 视为用户自管资源，不做任何远端写操作</li>
 *   <li><b>首次运行</b>：无映射 → 调 {@code POST /agents} 创建，工具 schema 自动映射
 *       （{@code AgentToolRegistry} 的 OpenAI function parameters → 方舟 input_schema）</li>
 *   <li><b>定义变更</b>：payload hash 与上次不同 → 带 version 乐观锁调更新；
 *       版本冲突时从 {@code GET /agents} 列表找回当前版本重试一次</li>
 *   <li><b>无变更</b>：hash 相同 → 零远端调用，不影响运行延迟</li>
 * </ul>
 */
@Slf4j
@Service
public class ArkAgentProvisioningService {

    public static final String PROVISIONING_KEY_PREFIX = "ark_provisioning:";
    public static final String PROVISIONING_CONFIG_TYPE = "ark_provisioning";

    /** 乐观锁冲突时从列表接口找回当前版本的重试上限 */
    private static final int UPDATE_RETRIES = 2;
    private static final int VERSION_LOOKUP_LIMIT = 100;
    /** system 提示词解析失败时的最终兜底 */
    private static final String FALLBACK_SYSTEM =
        "你是 Gaia 工作流平台的智能助手，通过声明的自定义工具查询与操作工作流。";

    private final ArkManagedClient client;
    private final AgentProviderConfigService providerConfigService;
    private final AgentConfigService configService;
    private final AgentToolRegistry toolRegistry;
    private final ToolExecutorRegistry toolExecutorRegistry;
    private final SystemPromptResolver promptResolver;

    public ArkAgentProvisioningService(ArkManagedClient client,
                                       AgentProviderConfigService providerConfigService,
                                       AgentConfigService configService,
                                       AgentToolRegistry toolRegistry,
                                       ToolExecutorRegistry toolExecutorRegistry,
                                       SystemPromptResolver promptResolver) {
        this.client = client;
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
        private Integer version;
        /** 本次是否新建了远端 Agent */
        private boolean created;
        /** 本次是否更新了远端 Agent */
        private boolean updated;
    }

    /** 定义是否为手动绑定（远端资源用户自管，自动同步不碰它） */
    public boolean isManuallyBound(AgentDefinition definition) {
        return definition != null
            && definition.getArkAgentId() != null
            && !definition.getArkAgentId().isEmpty();
    }

    /**
     * 确保定义在方舟侧有对应 Agent 资源，返回可用的 agentId/version。
     * 任何远端调用失败都向上抛出（引擎转为运行错误）——
     * 静默降级只会让「方舟上根本没有这个 Agent」的问题在创建 Session 时才爆出来。
     */
    public ProvisionedAgent ensureProvisioned(AgentDefinition definition) {
        if (isManuallyBound(definition)) {
            ProvisionedAgent bound = new ProvisionedAgent();
            bound.setAgentId(definition.getArkAgentId());
            bound.setVersion(definition.getArkAgentVersion());
            return bound;
        }

        AgentProviderConfigService.ArkConfig cfg = providerConfigService.getArkConfig();
        // 方舟创建 Agent 必须指定模型；提前给出可操作的提示，而不是让方舟返回晦涩的 400
        if (cfg.getDefaultModelId() == null || cfg.getDefaultModelId().isEmpty()) {
            throw new IllegalStateException(
                "方舟托管缺少「默认模型 ID」：请在 管理后台 → 配置 → 模型配置 → 火山方舟托管 填写 defaultModelId"
                    + "（如 deepseek-v4-1-flash-260910），自动创建远端 Agent 时必须指定模型");
        }
        JSONObject payload = buildAgentPayload(definition, cfg);
        String payloadHash = sha256(payload.toString());
        String configKey = PROVISIONING_KEY_PREFIX + definition.getId();
        JSONObject state = loadState(configKey);

        if (state == null) {
            JSONObject created = client.createAgent(cfg, payload.toString());
            ProvisionedAgent result = new ProvisionedAgent();
            result.setAgentId(created.getStr("id"));
            result.setVersion(created.getInt("version"));
            result.setCreated(true);
            saveState(configKey, result.getAgentId(), result.getVersion(), payloadHash);
            log.info("[ark-provision] 定义 {} 已自动创建为方舟 Agent {} v{}",
                definition.getId(), result.getAgentId(), result.getVersion());
            return result;
        }

        String agentId = state.getStr("agentId");
        Integer version = state.getInt("version");
        String knownHash = state.getStr("payloadHash");
        if (agentId == null || agentId.isEmpty()) {
            throw new IllegalStateException("映射状态损坏（缺少 agentId）：" + configKey);
        }
        if (payloadHash.equals(knownHash)) {
            ProvisionedAgent unchanged = new ProvisionedAgent();
            unchanged.setAgentId(agentId);
            unchanged.setVersion(version);
            return unchanged;
        }

        // 定义变更 → 带乐观锁更新；版本冲突（远端被并发更新/控制台改动）时找回当前版本重试
        ProvisionedAgent result = new ProvisionedAgent();
        result.setAgentId(agentId);
        for (int attempt = 0; attempt <= UPDATE_RETRIES; attempt++) {
            JSONObject updateBody = new JSONObject(payload);
            updateBody.set("version", version);
            try {
                JSONObject updated = client.updateAgent(cfg, agentId, updateBody.toString());
                result.setVersion(updated.getInt("version"));
                result.setUpdated(true);
                saveState(configKey, agentId, result.getVersion(), payloadHash);
                log.info("[ark-provision] 定义 {} 变更已同步到方舟 Agent {} v{}",
                    definition.getId(), agentId, result.getVersion());
                return result;
            } catch (ArkApiException e) {
                Integer current = attempt < UPDATE_RETRIES ? lookupCurrentVersion(cfg, agentId) : null;
                if (current == null || current.equals(version)) {
                    throw e;
                }
                log.warn("[ark-provision] 定义 {} 更新版本冲突（本地 v{} / 远端 v{}），重试",
                    definition.getId(), version, current);
                version = current;
            }
        }
        throw new IllegalStateException("方舟 Agent " + agentId + " 更新在 " + UPDATE_RETRIES + " 次重试后仍冲突");
    }

    // ---------------- payload 构建 ----------------

    /**
     * 本地定义 → 方舟 Agent 载荷。
     * name 用 definition.id（ASCII，满足方舟命名约束）；system 经三级兜底解析，总有值；
     * 工具 = （可选）沙箱内置工具集 + toolNames 中后端可执行工具的 Custom Tool 映射。
     */
    JSONObject buildAgentPayload(AgentDefinition definition, AgentProviderConfigService.ArkConfig cfg) {
        JSONObject payload = new JSONObject();
        payload.set("name", definition.getId());
        payload.set("description", definition.getDescription() != null
            && !definition.getDescription().isEmpty() ? definition.getDescription()
            : ("Gaia Agent: " + definition.getId()));

        String system = FALLBACK_SYSTEM;
        try {
            String resolved = promptResolver.resolve(definition, "zh-CN");
            if (resolved != null && !resolved.trim().isEmpty()) {
                system = resolved;
            }
        } catch (Exception e) {
            log.warn("[ark-provision] 解析 system 提示词失败，使用兜底: {}", e.getMessage());
        }
        payload.set("system", system);

        if (cfg.getDefaultModelId() != null && !cfg.getDefaultModelId().isEmpty()) {
            payload.set("model", new JSONObject().set("id", cfg.getDefaultModelId()));
        }

        JSONArray tools = new JSONArray();
        if (definition.isArkSandboxTools()) {
            tools.add(new JSONObject().set("type", "agent_toolset_20260701"));
        }
        JSONArray allSchemas = toolRegistry.getToolsSchema();
        for (int i = 0; i < allSchemas.size(); i++) {
            JSONObject tool = allSchemas.getJSONObject(i);
            JSONObject function = tool.getJSONObject("function");
            if (function == null) {
                continue;
            }
            String name = function.getStr("name");
            // 只暴露定义声明且后端可执行的工具；前端专属工具（canvas/navigate）没有 Custom Tool 执行方
            if (definition.getToolNames() != null && !definition.getToolNames().isEmpty()
                && !definition.getToolNames().contains(name)) {
                continue;
            }
            if (!toolExecutorRegistry.isBackendExecutable(name)) {
                continue;
            }
            JSONObject custom = new JSONObject()
                .set("type", "custom")
                .set("name", name)
                .set("description", function.getStr("description", "工具 " + name))
                .set("input_schema", function.get("parameters") != null
                    ? function.get("parameters") : new JSONObject().set("type", "object"));
            tools.add(custom);
        }
        payload.set("tools", tools);
        return payload;
    }

    // ---------------- 状态存取 ----------------

    private JSONObject loadState(String configKey) {
        AgentConfig config = configService.getOne(
            new QueryWrapper<AgentConfig>().eq("config_key", configKey));
        if (config == null || config.getConfigData() == null || config.getConfigData().isEmpty()) {
            return null;
        }
        try {
            return JSONUtil.parseObj(config.getConfigData());
        } catch (Exception e) {
            log.warn("[ark-provision] 解析映射状态失败（视为未同步）: {}", e.getMessage());
            return null;
        }
    }

    private void saveState(String configKey, String agentId, Integer version, String payloadHash) {
        try {
            JSONObject data = new JSONObject()
                .set("agentId", agentId)
                .set("version", version)
                .set("payloadHash", payloadHash);
            AgentConfig config = configService.getOne(
                new QueryWrapper<AgentConfig>().eq("config_key", configKey));
            AgentConfig entity = config != null ? config : new AgentConfig();
            entity.setConfigKey(configKey);
            entity.setConfigType(PROVISIONING_CONFIG_TYPE);
            entity.setTitle("方舟 Agent 自动同步状态（" + configKey.substring(PROVISIONING_KEY_PREFIX.length()) + "）");
            entity.setConfigData(data.toString());
            entity.setDescription("由 ArkAgentProvisioningService 维护，请勿手工编辑");
            if (config != null) {
                configService.updateById(entity);
            } else {
                configService.save(entity);
            }
        } catch (Exception e) {
            // 状态写失败只影响「下次重复创建/更新」的幂等性，不影响本次运行
            log.error("[ark-provision] 保存映射状态失败 {}: {}", configKey, e.getMessage());
        }
    }

    /** 从列表接口找回 Agent 当前版本（乐观锁冲突兜底），找不到返回 null */
    private Integer lookupCurrentVersion(AgentProviderConfigService.ArkConfig cfg, String agentId) {
        try {
            JSONObject page = client.listAgents(cfg, VERSION_LOOKUP_LIMIT);
            JSONArray data = page.getJSONArray("data");
            if (data == null) {
                return null;
            }
            for (int i = 0; i < data.size(); i++) {
                JSONObject agent = data.getJSONObject(i);
                if (agentId.equals(agent.getStr("id"))) {
                    return agent.getInt("version");
                }
            }
        } catch (Exception e) {
            log.warn("[ark-provision] 查询方舟 Agent 版本失败: {}", e.getMessage());
        }
        return null;
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
            // SHA-256 在 JVM 必然存在；走到这里说明环境异常，退化为原文 hash 语义仍成立
            return String.valueOf(text.hashCode());
        }
    }
}
