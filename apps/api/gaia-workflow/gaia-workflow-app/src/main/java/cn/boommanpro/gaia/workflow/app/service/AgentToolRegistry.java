package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolDefinition;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolDefinitionService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Agent 工具注册中心
 * 定义所有可调用工具的 OpenAI function calling schema
 *
 * DB-first 实现：工具定义优先从 agent_tool_definition 表加载，
 * 表为空时自动用硬编码 schema 建种；运行时可通过 {@link #refresh()} 热更新。
 */
@Slf4j
@Component
public class AgentToolRegistry {

    private final AgentToolDefinitionService toolDefinitionService;
    private final AgentConfigService configService;

    private JSONArray toolsSchema;
    private String promptZh;
    private String promptEn;

    /**
     * 当前已加载（enabled）的工具定义，供控制器 / 页面上下文过滤使用
     */
    private List<AgentToolDefinition> toolDefinitions = new ArrayList<>();

    /**
     * action -> 默认权限策略
     * always: 自动执行；confirm: 每次确认；forbid: 禁止
     */
    private final Map<String, String> defaultPolicies = new HashMap<>();

    /**
     * 节点 data 参数的结构提示（嵌入 canvas 工具的 data 参数 description 中）
     * <p>
     * 系统会将 LLM 提供的简化扁平字段自动 normalize 为 flowgram 嵌套结构，
     * 并与默认模板深度合并，因此 LLM 只需填写关键字段。
     * 将此提示内联到工具定义中，使 AI 无需依赖知识库即可构造合法节点 data。
     */
    /**
     * 节点 data 参数的简短提示（嵌入 canvas/applyWorkflow 的 data 参数 description）。
     * <p>完整字段说明放在系统提示词「data 参数填写规则」中 —— 实测把大段说明塞进
     * JSON schema 的深层 description 会让弱模型直接放弃填 data（工具调用参数质量暴跌），
     * 而系统提示词正文模型遵循得很好。</p>
     */
    private static final String NODE_DATA_SCHEMA_HINT =
        "节点业务数据，扁平写字段即可，系统自动 normalize。"
        + "llm 例：{\"prompt\":\"总结：{{ start.text }}\"}；"
        + "http 例：{\"method\":\"GET\",\"url\":\"https://...\"}；"
        + "code 填 {\"script\":{\"language\":\"java\",\"content\":\"return ...;\"}}。"
        + "各类型完整字段说明见系统提示词「data 参数填写规则」一节。";

    public AgentToolRegistry(AgentToolDefinitionService toolDefinitionService,
                             AgentConfigService configService) {
        this.toolDefinitionService = toolDefinitionService;
        this.configService = configService;
    }

    @PostConstruct
    public void init() throws IOException {
        // classpath 文件作为兜底默认值
        promptZh = readResource("agent/prompt-zh.md");
        promptEn = readResource("agent/prompt-en.md");
        loadFromDatabase();
        loadSystemPromptFromDb();
    }

    /**
     * 从 agent_config 表加载系统提示词，覆盖 classpath 默认值
     * configType=system_prompt，configKey=system_prompt.default
     */
    private void loadSystemPromptFromDb() {
        try {
            AgentConfig config = configService.getOne(
                new QueryWrapper<AgentConfig>()
                    .eq("config_key", "system_prompt.default")
                    .eq("config_type", "system_prompt"));
            if (config != null && config.getContent() != null && !config.getContent().isEmpty()) {
                promptZh = config.getContent();
                log.info("Loaded system prompt from DB ({} chars)", config.getContent().length());
            }
            // 英文版
            AgentConfig configEn = configService.getOne(
                new QueryWrapper<AgentConfig>()
                    .eq("config_key", "system_prompt.default.en")
                    .eq("config_type", "system_prompt"));
            if (configEn != null && configEn.getContent() != null && !configEn.getContent().isEmpty()) {
                promptEn = configEn.getContent();
                log.info("Loaded EN system prompt from DB ({} chars)", configEn.getContent().length());
            }
        } catch (Exception e) {
            log.warn("Failed to load system prompt from DB, using classpath fallback: {}", e.getMessage());
        }
    }

    /**
     * 热刷新系统提示词（管理后台保存后触发）
     */
    public void refreshSystemPrompt() {
        loadSystemPromptFromDb();
    }

    /**
     * 从数据库加载工具定义（首次加载允许自动建种）
     */
    private void loadFromDatabase() {
        loadFromDatabase(true);
    }

    /**
     * 确保工具定义已播种到 DB（表为空时建种）。
     * 由 {@link cn.boommanpro.gaia.workflow.app.config.AgentDataSeeder} 在 SQL 初始化完成后调用，
     * 弥补 {@code @PostConstruct} 时机过早可能导致的建种失败。
     */
    public void ensureSeeded() {
        loadFromDatabase(true);
    }

    /**
     * 旧版独立工具名（第一代）+ v1 复合工具名（第二代）—— 迁移检测用，启动时删除
     */
    private static final String[] OLD_TOOL_NAMES = {
        // 第一代 21 个独立工具
        "goHome", "goAdmin", "goReleases", "goEditor", "goTemplateEditor",
        "listWorkflows", "listTemplates", "listLogs", "getWorkflowDetail", "getNodeDetail",
        "createWorkflow", "createTemplate", "saveWorkflow", "deleteWorkflow",
        "addNode", "updateNode", "deleteNode", "connect", "disconnect", "autoLayout",
        // 第二代 7 个复合工具（v2 用 dsh 命名替代）
        "navigate", "query", "manage", "canvas", "applyWorkflow", "createPlan", "executeStep"
    };

    /**
     * 从数据库加载工具定义
     *
     * @param allowSeed 表为空时是否自动建种（首次启动允许，热刷新不允许）
     */
    private void loadFromDatabase(boolean allowSeed) {
        try {
            // 1. 迁移检测：删除所有旧版独立工具（仅删除旧工具名，不影响新复合工具）
            if (allowSeed) {
                int deleted = 0;
                for (String oldName : OLD_TOOL_NAMES) {
                    long cnt = toolDefinitionService.count(
                        new QueryWrapper<AgentToolDefinition>().eq("tool_name", oldName));
                    if (cnt > 0) {
                        toolDefinitionService.remove(
                            new QueryWrapper<AgentToolDefinition>().eq("tool_name", oldName));
                        deleted += cnt;
                    }
                }
                if (deleted > 0) {
                    log.info("Migrated: removed {} old individual tool definitions", deleted);
                }
            }

            // 2. 表为空时建种
            long total = toolDefinitionService.count();
            if (total == 0) {
                if (allowSeed) {
                    seedFromHardcoded();
                } else {
                    log.warn("Refresh skipped seeding: agent_tool_definition table is empty");
                }
            }

            // 2.5 增量补齐：硬编码 schema 里新增、但 DB 还没有的工具自动建种。
            // 否则升级后新增的工具（如 applyWorkflow）在已存在的库上永远不会生效。
            if (allowSeed) {
                seedMissingTools();
            }

            // 3. 加载启用的工具定义
            List<AgentToolDefinition> enabled = toolDefinitionService.list(
                new QueryWrapper<AgentToolDefinition>()
                    .eq("enabled", 1)
                    .orderByAsc("sort_order", "id"));
            this.toolDefinitions = enabled;
            this.toolsSchema = buildSchemaFromDefinitions(enabled);

            this.defaultPolicies.clear();
            for (AgentToolDefinition t : enabled) {
                if (t.getToolName() != null && t.getDefaultPolicy() != null) {
                    this.defaultPolicies.put(t.getToolName(), t.getDefaultPolicy());
                }
            }
            log.info("Loaded {} enabled tool definitions from DB", enabled.size());
        } catch (Exception e) {
            log.warn("Failed to load tool definitions from DB, falling back to hardcoded schema", e);
            this.toolsSchema = buildToolsSchema();
            this.toolDefinitions = new ArrayList<>();
            this.defaultPolicies.clear();
            this.defaultPolicies.putAll(buildDefaultPolicies());
        }
    }

    /**
     * 用硬编码 schema 对空表进行建种
     */
    private void seedFromHardcoded() {
        JSONArray hardcoded = buildToolsSchema();
        Map<String, String> policies = buildDefaultPolicies();
        int order = 0;
        for (Object item : hardcoded) {
            JSONObject tool = (JSONObject) item;
            JSONObject function = tool.getJSONObject("function");
            String name = function.getStr("name");
            String desc = function.getStr("description");
            JSONObject params = function.getJSONObject("parameters");

            AgentToolDefinition def = new AgentToolDefinition();
            def.setToolName(name);
            def.setToolGroup(toolGroupOf(name));
            def.setDescription(desc);
            def.setParameters(params != null ? params.toString() : new JSONObject().toString());
            def.setDefaultPolicy(policies.getOrDefault(name, "confirm"));
            def.setPageContexts(null);
            def.setEnabled(1);
            def.setSortOrder(order++);
            String now = LocalDateTime.now().toString();
            def.setCreatedAt(now);
            def.setUpdatedAt(now);
            toolDefinitionService.save(def);
        }
        log.info("Auto-seeded {} tool definitions into agent_tool_definition table", hardcoded.size());
    }

    /**
     * 增量补齐工具定义：缺失的建种；代码侧 schema 有变更的（description/parameters 不一致）
     * 同步覆盖 DB —— 否则升级后新增参数（如 manage.confirmed）在老库上永远不生效，
     * 模型看不到新参数导致行为退化。以 description/parameters 一致性为准，
     * default_policy/enabled/sort_order 等用户可调字段不碰。
     */
    private void seedMissingTools() {
        JSONArray hardcoded = buildToolsSchema();
        Map<String, String> policies = buildDefaultPolicies();

        int maxOrder = 0;
        for (AgentToolDefinition existing : toolDefinitionService.list()) {
            maxOrder = Math.max(maxOrder, existing.getSortOrder() == null ? 0 : existing.getSortOrder());
        }

        int added = 0;
        int updated = 0;
        for (Object item : hardcoded) {
            JSONObject tool = (JSONObject) item;
            JSONObject function = tool.getJSONObject("function");
            String name = function.getStr("name");
            if (name == null) continue;
            String desc = function.getStr("description");
            JSONObject params = function.getJSONObject("parameters");
            String paramsJson = params != null ? params.toString() : new JSONObject().toString();

            AgentToolDefinition existing = toolDefinitionService.getOne(
                new QueryWrapper<AgentToolDefinition>().eq("tool_name", name));
            if (existing != null) {
                if (!Objects.equals(existing.getDescription(), desc)
                    || !Objects.equals(existing.getParameters(), paramsJson)) {
                    existing.setDescription(desc);
                    existing.setParameters(paramsJson);
                    existing.setUpdatedAt(LocalDateTime.now().toString());
                    toolDefinitionService.updateById(existing);
                    updated++;
                    log.info("Synced tool definition from code: {} (description/parameters changed)", name);
                }
                continue;
            }

            AgentToolDefinition def = new AgentToolDefinition();
            def.setToolName(name);
            def.setToolGroup(toolGroupOf(name));
            def.setDescription(desc);
            def.setParameters(paramsJson);
            def.setDefaultPolicy(policies.getOrDefault(name, "confirm"));
            def.setEnabled(1);
            def.setSortOrder(++maxOrder);
            String now = LocalDateTime.now().toString();
            def.setCreatedAt(now);
            def.setUpdatedAt(now);
            toolDefinitionService.save(def);
            added++;
        }
        if (added > 0) {
            log.info("Seeded {} missing tool definition(s) into agent_tool_definition table", added);
        }
        if (updated > 0) {
            log.info("Synced {} changed tool definition(s) from code", updated);
        }
    }

    /**
     * 热刷新：从数据库重新加载工具定义（不建种）
     */
    public void refresh() {
        loadFromDatabase(false);
    }

    public JSONArray getToolsSchema() {
        return toolsSchema;
    }

    /**
     * 按页面上下文过滤工具 schema
     *
     * @param pageContext 页面上下文 JSON 字符串，需包含 route 字段
     * @return 过滤后的工具 schema；pageContext 为空时返回全部
     */
    public JSONArray getToolsSchema(String pageContext) {
        if (pageContext == null || pageContext.isEmpty()) {
            return getToolsSchema();
        }
        String pageId = resolvePageIdentifier(pageContext);
        JSONArray filtered = new JSONArray();
        for (Object item : toolsSchema) {
            JSONObject tool = (JSONObject) item;
            String name = tool.getJSONObject("function").getStr("name");
            AgentToolDefinition def = findDefinition(name);
            if (def == null || appliesToPage(def, pageId)) {
                filtered.add(tool);
            }
        }
        return filtered;
    }

    public List<AgentToolDefinition> getToolDefinitions() {
        return toolDefinitions;
    }

    public String getSystemPrompt(String locale, String pageContext) {
        // 每次调用从 DB 读取最新内容，确保管理后台修改即时生效
        String prompt = loadPromptFromDb(locale);
        if (pageContext != null && !pageContext.isEmpty()) {
            prompt += "\n\n## 当前页面上下文\n```json\n" + pageContext + "\n```";
        }
        return prompt;
    }

    /**
     * 从 DB 加载系统提示词，DB 无记录时 fallback 到 classpath 缓存
     */
    private String loadPromptFromDb(String locale) {
        boolean isZh = "zh-CN".equals(locale);
        String configKey = isZh ? "system_prompt.default" : "system_prompt.default.en";
        try {
            AgentConfig config = configService.getOne(
                new QueryWrapper<AgentConfig>()
                    .eq("config_key", configKey)
                    .eq("config_type", "system_prompt"));
            if (config != null && config.getContent() != null && !config.getContent().isEmpty()) {
                return config.getContent();
            }
        } catch (Exception e) {
            log.warn("Failed to load system prompt from DB for locale {}: {}", locale, e.getMessage());
        }
        // fallback 到 classpath 缓存
        return isZh ? promptZh : promptEn;
    }

    public String getDefaultPolicy(String action) {
        return defaultPolicies.getOrDefault(action, "confirm");
    }

    /**
     * 取某工具的 parameters schema（运行时参数校验用）。
     * 优先内存缓存（DB 加载结果），缺失时兜底查硬编码种子。
     */
    public JSONObject getToolParameters(String toolName) {
        if (toolName == null) {
            return null;
        }
        try {
            if (toolsSchema != null) {
                for (int i = 0; i < toolsSchema.size(); i++) {
                    JSONObject tool = toolsSchema.getJSONObject(i);
                    JSONObject function = tool.getJSONObject("function");
                    if (function != null && toolName.equals(function.getStr("name"))) {
                        return function.getJSONObject("parameters");
                    }
                }
            }
            // 兜底：硬编码种子里找（DB 加载失败 / 定义未启用时）
            JSONArray hardcoded = buildToolsSchema();
            for (int i = 0; i < hardcoded.size(); i++) {
                JSONObject function = hardcoded.getJSONObject(i).getJSONObject("function");
                if (function != null && toolName.equals(function.getStr("name"))) {
                    return function.getJSONObject("parameters");
                }
            }
        } catch (Exception e) {
            log.warn("Failed to get parameters for tool [{}]: {}", toolName, e.getMessage());
        }
        return null;
    }

    public Map<String, String> getAllDefaultPolicies() {
        return defaultPolicies;
    }

    // ===== 内部：DB -> schema 构建 =====

    private JSONArray buildSchemaFromDefinitions(List<AgentToolDefinition> defs) {
        JSONArray tools = new JSONArray();
        for (AgentToolDefinition d : defs) {
            JSONObject params;
            try {
                params = (d.getParameters() != null && !d.getParameters().isEmpty())
                    ? JSONUtil.parseObj(d.getParameters())
                    : new JSONObject();
            } catch (Exception e) {
                log.warn("Failed to parse parameters for tool [{}]: {}", d.getToolName(), e.getMessage());
                params = new JSONObject();
            }
            JSONObject entry = new JSONObject()
                .set("type", "function")
                .set("function", new JSONObject()
                    .set("name", d.getToolName())
                    .set("description", d.getDescription())
                    .set("parameters", params));
            tools.add(entry);
        }
        return tools;
    }

    private AgentToolDefinition findDefinition(String toolName) {
        if (toolDefinitions == null) {
            return null;
        }
        for (AgentToolDefinition d : toolDefinitions) {
            if (toolName.equals(d.getToolName())) {
                return d;
            }
        }
        return null;
    }

    private boolean appliesToPage(AgentToolDefinition def, String pageId) {
        String ctx = def.getPageContexts();
        if (ctx == null || ctx.trim().isEmpty()) {
            return true;
        }
        try {
            JSONArray arr = JSONUtil.parseArray(ctx);
            return arr.contains(pageId);
        } catch (Exception e) {
            log.warn("Failed to parse pageContexts for tool [{}]: {}", def.getToolName(), e.getMessage());
            return true;
        }
    }

    private String resolvePageIdentifier(String pageContext) {
        try {
            JSONObject ctx = JSONUtil.parseObj(pageContext);
            String route = ctx.getStr("route");
            if (route == null || route.isEmpty()) {
                return "other";
            }
            return routeToPageId(route);
        } catch (Exception e) {
            return "other";
        }
    }

    private String routeToPageId(String route) {
        if ("/".equals(route)) {
            return "home";
        }
        if ("/admin".equals(route) || route.startsWith("/admin/")) {
            return "admin";
        }
        if ("/editor".equals(route) || route.startsWith("/editor/")) {
            return "editor";
        }
        if ("/releases".equals(route)) {
            return "releases";
        }
        return "other";
    }

    private String toolGroupOf(String toolName) {
        if (toolName == null) {
            return "other";
        }
        switch (toolName) {
            case "list_workflows":
            case "read_workflow":
            case "read_node":
            case "list_runs":
            case "list_templates":
            case "search_knowledge":
            case "get_node_schema":
                return "read";
            case "edit_workflow":
                return "edit";
            case "run_workflow":
                return "run";
            case "write_workflow":
            case "save_workflow":
            case "delete_workflow":
                return "commit";
            case "todo_write":
                return "meta";
            default:
                return "other";
        }
    }

    private String readResource(String path) throws IOException {
        ClassPathResource resource = new ClassPathResource(path);
        try (java.io.InputStream is = resource.getInputStream()) {
            java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
            byte[] data = new byte[4096];
            int n;
            while ((n = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, n);
            }
            return new String(buffer.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    // ===== 硬编码种子 schema（DB 为空时建种使用） =====

    private Map<String, String> buildDefaultPolicies() {
        Map<String, String> policies = new HashMap<>();
        // 读层：无副作用，直接放行
        policies.put("list_workflows", "always");
        policies.put("read_workflow", "always");
        policies.put("read_node", "always");
        policies.put("list_runs", "always");
        policies.put("list_templates", "always");
        policies.put("search_knowledge", "always");
        policies.put("get_node_schema", "always");
        // 会话域编辑：草稿不落库，放行
        policies.put("edit_workflow", "always");
        // 试运行：沙箱执行，放行
        policies.put("run_workflow", "always");
        // 落版是人机交接点（agent-artifact-design.md D1）：走 confirm 门禁，
        // 具体模式由 agent.policy.apply_confirm_mode 控制（默认 require）
        policies.put("write_workflow", "confirm");
        policies.put("save_workflow", "confirm");
        // 删除不可逆：确认
        policies.put("delete_workflow", "confirm");
        // todo：纯展示状态
        policies.put("todo_write", "always");
        return policies;
    }

    private JSONArray buildToolsSchema() {
        JSONArray tools = new JSONArray();
        String nodeTypes = "start, end, llm, code, http, condition, multi-condition, branches, loop, variable, string-format, assignee, comment";

        // ===== 读层 =====
        tools.add(func("list_workflows", "列出工作流目录（编码/名称/revision）。找目标工作流或确认存在性时用", obj(
            null, new JSONObject[]{
                str("keyword", "按名称/编码过滤（可选）", null)
            }
        )));

        tools.add(func("read_workflow", "读取工作流完整 DSL，返回 nodes/edges 和 revision。"
            + "修改已有工作流前【必须先调用】：revision 是后续落版的 baseRevision（CAS 基准），"
            + "读取会同时把它同步为本会话草稿（之后 edit_workflow 直接改）", obj(
            new String[]{"workflowCode"}, new JSONObject[]{
                str("workflowCode", "工作流编码", null)
            }
        )));

        tools.add(func("read_node", "读取单个节点详情 + 全部可用变量（更新节点前核对字段与可引用变量用；基于会话草稿）", obj(
            new String[]{"nodeId"}, new JSONObject[]{
                str("nodeId", "节点ID", null)
            }
        )));

        tools.add(func("list_runs", "查询工作流执行日志（状态/耗时/错误）", obj(
            null, new JSONObject[]{
                str("workflowCode", "按工作流过滤（可选，不传则查最近）", null)
            }
        )));

        tools.add(func("list_templates", "列出工作流模板目录", obj(
            null, new JSONObject[]{
                str("keyword", "按名称/编码过滤（可选）", null)
            }
        )));

        tools.add(func("search_knowledge", "检索知识库（节点用法/示例/最佳实践）。不确定某概念或用法时先搜一下", obj(
            new String[]{"query"}, new JSONObject[]{
                str("query", "检索词（自然语言）", null),
                num("topK", "返回条数（默认5，最大8）", 5)
            }
        )));

        tools.add(func("get_node_schema", "获取节点类型的完整字段结构与 JSON 示例。"
            + "【配置任何节点前先查它】，尤其是不常用的类型（loop/branches/variable 等）", obj(
            new String[]{"nodeType"}, new JSONObject[]{
                str("nodeType", "节点类型", enumVal("start", "end", "llm", "code", "http", "condition",
                    "multi-condition", "branches", "loop", "variable", "string-format", "assignee", "comment"))
            }
        )));

        // ===== 编辑层 =====
        tools.add(func("edit_workflow",
            "增量修改工作流（会话草稿）。ops 数组一次性原子应用：任一 op 非法则整批拒绝并给出逐项修复指引。"
            + "已有工作流先 read_workflow（或传 workflowCode）同步为草稿，再改；改完用 save_workflow 落版。"
            + "新增节点【必须】带 type 和 data（业务字段直接放 data，扁平写法）："
            + "{\"op\":\"addNode\",\"ref\":\"http_1\",\"type\":\"http\",\"data\":{\"method\":\"POST\",\"url\":\"https://...\"}}；"
            + "随后用 connect(from:\"$http_1\", to:\"end_1\") 接线（$ref 引用同批新节点)。"
            + "改已有节点用 {\"op\":\"updateNode\",\"nodeId\":\"llm_1\",\"data\":{只传变更字段}}（深合并）。",
            obj(null, new JSONObject[]{
                str("workflowCode", "目标工作流编码（可选；草稿未绑定时自动从该工作流当前版本同步）", null),
                str("ops", "（形状一）操作数组，见 items 说明", null),
                arrProp("addNodes", "（形状二·推荐）新增节点数组，元素同 write_workflow 的 nodes：{type, ref?, id?, title?, data?}，后续用 $ref 引用", obj(
                    new String[]{"type"}, new JSONObject[]{
                        str("type", "节点类型（start/end/llm/code/http/condition/multi-condition/branches/loop/variable/string-format/assignee/comment）", null),
                        str("ref", "本批引用名（后续 addEdges 的 from/to 用 $ref 引用）", null),
                        str("id", "节点ID（可选）", null),
                        str("title", "节点标题", null),
                        objProp("data", NODE_DATA_SCHEMA_HINT)
                    })),
                arrProp("updateNodes", "修改变量数组：{nodeId, title?, data?}（data 深合并只传变更字段）", obj(
                    new String[]{"nodeId"}, new JSONObject[]{
                        str("nodeId", "目标节点ID", null),
                        str("title", "新标题（可选）", null),
                        objProp("data", "变更字段（深合并）")
                    })),
                arrProp("removeNodes", "要删除的节点：{nodeId}", obj(
                    new String[]{"nodeId"}, new JSONObject[]{
                        str("nodeId", "节点ID", null)
                    })),
                arrProp("addEdges", "新增连线：{from, to, fromPort?}（from/to 可用 $ref）", obj(
                    new String[]{"from", "to"}, new JSONObject[]{
                        str("from", "源节点ID或$ref", null),
                        str("to", "目标节点ID或$ref", null),
                        str("fromPort", "源端口（条件/分支多出口）", null)
                    })),
                arrProp("removeEdges", "删除连线：{from, to}", obj(
                    new String[]{"from", "to"}, new JSONObject[]{
                        str("from", "源节点ID", null),
                        str("to", "目标节点ID", null)
                    })),
                arrProp("ops", "操作数组（按顺序应用到草稿）", obj(new String[]{"op"}, new JSONObject[]{
                    str("op", "操作类型", enumVal("addNode", "updateNode", "deleteNode", "connect", "disconnect", "autoLayout")),
                    str("ref", "addNode 时可选：本批引用名，后续 op 用 $ref 引用它", null),
                    str("type", "addNode：节点类型（" + nodeTypes + "）", null),
                    str("id", "addNode：节点ID（可选，省略自动分配）", null),
                    str("title", "addNode/updateNode：节点标题", null),
                    objProp("data", NODE_DATA_SCHEMA_HINT),
                    str("afterNodeId", "addNode：放在某节点之后（可选）", null),
                    str("nodeId", "updateNode/deleteNode：目标节点ID（本批新节点可用 $ref）", null),
                    str("from", "connect/disconnect：源节点ID", null),
                    str("to", "connect/disconnect：目标节点ID", null),
                    str("fromPort", "connect：源端口（条件/分支多出口时用）", null)
                }))
            })));

        // ===== 执行层 =====
        tools.add(func("run_workflow", "试运行当前会话草稿的工作流，等待终态并返回输出（超时默认180s）。"
            + "落版前后都可以跑，用真实输出验证节点配置", obj(
            null, new JSONObject[]{
                objProp("inputs", "运行输入参数（可选，如 {\"query\":\"测试输入\"}）"),
                num("timeoutMs", "超时毫秒数（默认180000，最大600000）", 180000)
            }
        )));

        // ===== 落版层 =====
        tools.add(func("write_workflow",
            "一次性写入完整工作流 DSL 并落为生效版本。【仅新建或推倒重来时用】——"
            + "修改已有工作流请走 read_workflow → edit_workflow → save_workflow 增量链路。"
            + "系统会自动规范化：补 id、缺坐标自动布局、扁平字段转嵌套结构、去重连线、缺 start/end 自动补齐。"
            + "对已存在的工作流整写必须带 baseRevision（read_workflow 获取），否则拒绝。",
            obj(new String[]{"nodes"}, new JSONObject[]{
                str("workflowCode", "工作流编码。留空表示新建，系统自动生成", null),
                str("workflowName", "工作流名称（新建时使用）", null),
                str("workflowDesc", "工作流描述", null),
                str("versionDesc", "版本描述", null),
                num("baseRevision", "整写已有工作流时的 CAS 基准（read_workflow 返回的 revision）", null),
                arrProp("nodes", "节点数组。每项 {id?, type, title?, data?}；给 id 用语义化命名（如 llm_summarize），连线直接引用", obj(
                    new String[]{"type"}, new JSONObject[]{
                        str("type", "节点类型（" + nodeTypes + "）", null),
                        str("id", "节点ID，省略则自动生成", null),
                        str("title", "节点标题", null),
                        objProp("data", NODE_DATA_SCHEMA_HINT)
                    })),
                arrProp("edges", "连线数组。每项 {from, to}，必须覆盖完整执行链路，不要留孤立节点", obj(
                    new String[]{"from", "to"}, new JSONObject[]{
                        str("from", "源节点ID", null),
                        str("to", "目标节点ID", null),
                        str("fromPort", "源端口（条件/分支多出口时用）", null)
                    }))
            })));

        tools.add(func("save_workflow", "把当前会话草稿落为生效版本（edit_workflow 修改后的收口动作）。"
            + "默认作用于当前绑定的工作流，无需重复传 workflowCode；revision 基准自动携带", obj(
            null, new JSONObject[]{
                str("workflowCode", "目标工作流编码（可选；默认用会话草稿绑定的）", null),
                str("name", "工作流名称（可选，顺带改名）", null),
                str("versionDesc", "版本描述（可选）", null),
                num("baseRevision", "CAS 基准（可选；默认用草稿记录的 revision）", null)
            })));

        tools.add(func("delete_workflow", "删除工作流（不可逆）。必须先向用户复述删除目标并征得明确同意，"
            + "然后携带 confirmed=true 调用", obj(
            new String[]{"workflowCode"}, new JSONObject[]{
                str("workflowCode", "工作流编码", null),
                str("confirmed", "用户明确同意后传 true；未确认时工具会拒绝执行", null)
            }
        )));

        // ===== 元层 =====
        tools.add(func("todo_write", "写入/更新任务进度清单（3 步以上的任务先列清单，完成一项勾一项）。"
            + "这只是进度展示，不影响执行——每步仍由你在主循环里逐个完成", obj(
            new String[]{"steps"}, new JSONObject[]{
                arrProp("steps", "清单步骤（全量重写，每次传完整列表）", obj(new String[]{"content"}, new JSONObject[]{
                    str("id", "步骤ID（可选）", null),
                    str("content", "步骤内容（一句话）", null),
                    str("status", "状态", enumVal("pending", "in_progress", "completed", "blocked"))
                }))
            }
        )));

        return tools;
    }

    // ===== 辅助方法 =====

    private JSONObject func(String name, String desc, JSONObject params) {
        return new JSONObject()
            .set("type", "function")
            .set("function", new JSONObject()
                .set("name", name)
                .set("description", desc)
                .set("parameters", params));
    }

    /**
     * 构建 object 类型 parameters
     * @param required 必填属性名数组
     * @param props    对应的属性 schema 数组（与 required 顺序无关，按名匹配）
     */
    private JSONObject obj(String[] required, JSONObject[] props) {
        JSONObject properties = new JSONObject();
        for (JSONObject prop : props) {
            if (prop != null && prop.containsKey("__name")) {
                String name = prop.getStr("__name");
                prop.remove("__name");
                properties.set(name, prop);
            }
        }
        JSONObject result = new JSONObject()
            .set("type", "object")
            .set("properties", properties);
        if (required != null && required.length > 0) {
            result.set("required", JSONUtil.parseArray(java.util.Arrays.asList(required)));
        }
        return result;
    }

    private JSONObject str(String name, String desc, JSONObject extra) {
        JSONObject p = new JSONObject().set("__name", name).set("type", "string");
        if (desc != null) p.set("description", desc);
        if (extra != null) p.putAll(extra);
        return p;
    }

    private JSONObject num(String name, String desc, Number defaultValue) {
        JSONObject p = new JSONObject().set("__name", name).set("type", "number");
        if (desc != null) p.set("description", desc);
        if (defaultValue != null) p.set("default", defaultValue);
        return p;
    }

    private JSONObject enumVal(String... values) {
        JSONObject p = new JSONObject();
        p.set("enum", JSONUtil.parseArray(java.util.Arrays.asList(values)));
        return p;
    }

    private JSONObject objProp(String name, String desc) {
        return new JSONObject().set("__name", name).set("type", "object").set("description", desc);
    }

    private JSONObject boolProp(String name, String desc, boolean defaultValue) {
        JSONObject p = new JSONObject().set("__name", name).set("type", "boolean");
        if (desc != null) p.set("description", desc);
        p.set("default", defaultValue);
        return p;
    }

    private JSONObject arrProp(String name, String desc, JSONObject items) {
        JSONObject p = new JSONObject().set("__name", name).set("type", "array").set("description", desc);
        if (items != null) p.set("items", items);
        return p;
    }
}
