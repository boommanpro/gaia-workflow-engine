package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSkill;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolDefinition;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolDefinitionService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolGroup;
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
    private final AgentSkillCatalog skillCatalog;

    private JSONArray toolsSchema;

    /**
     * 当前已加载（enabled）的工具定义，供控制器 / 页面上下文过滤使用
     */
    private List<AgentToolDefinition> toolDefinitions = new ArrayList<>();

    /**
     * 系统提示词正文中工具目录段的位置标记：渲染时以「启用的工具定义」
     * 动态生成的目录替换该行 —— 管理端禁用/新增工具后无需改提示词正文。
     */
    private static final String TOOLS_CATALOG_MARKER = "<!-- gaia:tools-catalog -->";

    /** 工具目录中每个工具的一句话说明（与 schema 的长 description 互补，保持目录紧凑） */
    private static final Map<String, String> TOOL_SUMMARIES = buildToolSummaries();

    /** 首次种入工具目录时默认关闭的工具：需要外部密钥或有调用成本，配好再开 */
    private static final java.util.Set<String> DEFAULT_DISABLED_TOOLS = java.util.Set.of("web_search");

    private static Map<String, String> buildToolSummaries() {
        Map<String, String> m = new java.util.LinkedHashMap<>();
        m.put("skill", "按名称加载技能全文；`skill(\"name/path\")` 取引用文件。开工第一步加载 gaia-workflow-assistant");
        m.put("ask_user", "向用户提问并等待回答（点选/自由输入，答案成为新一轮对话；只问缺了会白做的关键信息；超时自动选 recommended 项继续）");
        m.put("todo_write", "任务进度清单（3 步以上任务先列清单，完成一项勾一项）");
        m.put("web_search", "联网搜索（Tavily）：关键词 → 标题+摘要+链接；密钥在 Agent 配置中心·工具定义页配置，默认关闭，配好密钥后开启");
        m.put("web_fetch", "抓取网页：http/https 地址 → 页面文本（30s 超时、10 万字符上限）");
        m.put("get", "四合一查询：target=canvas 画布核心视图 / node 单节点配置+入出边 / variables 可引用变量 / knowledge 节点类型知识");
        m.put("node", "节点增改删：action=add（items 批量，connect 用 $ref 接线）/ update（data 深合并）/ remove（级联连线）");
        m.put("edge", "连线/断线：action=connect / remove；分支出边必须带 fromPort");
        m.put("run", "执行：target=node 单节点试跑 / workflow 整流试跑（真跑草稿，回 outputs+节点状态）/ tests 跑测试用例");
        m.put("test_case", "沉淀测试用例（输入 + 期望断言 exists/equals/contains）");
        return java.util.Collections.unmodifiableMap(m);
    }

    private final AgentPromptComposer promptComposer;

    public AgentToolRegistry(AgentToolDefinitionService toolDefinitionService,
                             AgentPromptComposer promptComposer,
                             AgentSkillCatalog skillCatalog) {
        this.toolDefinitionService = toolDefinitionService;
        this.promptComposer = promptComposer;
        this.skillCatalog = skillCatalog;
    }

    @PostConstruct
    public void init() {
        loadFromDatabase();
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
     * 2026-10-17 工具体系重构下线的工具：启动时从 DB 移除定义（保留在 git 历史可回滚）。
     * save_workflow 自 2026-10-11 起落版只由用户界面触发，一并清理。
     */
    private static final String[] REMOVED_TOOL_NAMES = {
        "save_workflow",
        "write_workflow", "edit_workflow", "delete_workflow",
        "list_workflows", "list_templates", "list_runs",
        "search_knowledge", "get_node_schema",
        "read_workflow", "read_node", "memory",
        "get_canvas", "get_node", "get_node_variables",
        "add_node", "update_node", "remove_node",
        "connect_edge", "remove_edge",
        "run_node", "run_workflow", "run_tests", "add_test_case",
        "get_node_knowledge"
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
                int removedNew = 0;
                for (String name : REMOVED_TOOL_NAMES) {
                    long cnt = toolDefinitionService.count(
                        new QueryWrapper<AgentToolDefinition>().eq("tool_name", name));
                    if (cnt > 0) {
                        toolDefinitionService.remove(
                            new QueryWrapper<AgentToolDefinition>().eq("tool_name", name));
                        removedNew += cnt;
                    }
                }
                if (removedNew > 0) {
                    log.info("Migrated: removed {} decommissioned tool definitions (2026-10 tool redesign)", removedNew);
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
            log.info("Loaded {} enabled tool definitions from DB", enabled.size());
        } catch (Exception e) {
            log.warn("Failed to load tool definitions from DB, falling back to hardcoded schema", e);
            this.toolsSchema = buildToolsSchema();
            this.toolDefinitions = new ArrayList<>();
        }
    }

    /**
     * 用硬编码 schema 对空表进行建种
     */
    private void seedFromHardcoded() {
        JSONArray hardcoded = buildToolsSchema();
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
            def.setPageContexts(null);
            def.setEnabled(DEFAULT_DISABLED_TOOLS.contains(name) ? 0 : 1);
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
     * 同步覆盖 DB —— 否则升级后新增参数在老库上永远不生效，
     * 模型看不到新参数导致行为退化。以 description/parameters 一致性为准，
     * enabled/sort_order 等用户可调字段不碰。
     */
    private void seedMissingTools() {
        JSONArray hardcoded = buildToolsSchema();

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
                String group = toolGroupOf(name);
                if (!Objects.equals(existing.getDescription(), desc)
                    || !Objects.equals(existing.getParameters(), paramsJson)
                    || !Objects.equals(existing.getToolGroup(), group)) {
                    existing.setDescription(desc);
                    existing.setParameters(paramsJson);
                    existing.setToolGroup(group);
                    existing.setUpdatedAt(LocalDateTime.now().toString());
                    toolDefinitionService.updateById(existing);
                    updated++;
                    log.info("Synced tool definition from code: {} (description/parameters/group changed)", name);
                }
                continue;
            }

            AgentToolDefinition def = new AgentToolDefinition();
            def.setToolName(name);
            def.setToolGroup(toolGroupOf(name));
            def.setDescription(desc);
            def.setParameters(paramsJson);
            // 首次种入默认关闭的工具（需外部密钥/有成本，配好再开）
            def.setEnabled(DEFAULT_DISABLED_TOOLS.contains(name) ? 0 : 1);
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

    /**
     * 组装默认系统提示词：DB 正文（管理后台可改）+ 按当前启用状态动态渲染的工具目录。
     *
     * @param allowedTools 该 Agent 可用的工具名集合；null/空表示全部启用工具
     *                     （目录与实际下发的工具 schema 保持一致，避免正文目录撒谎）
     */
    public String getSystemPrompt(String locale, java.util.Set<String> allowedTools) {
        // 默认提示词 = IDENTITY+SOUL+AGENTS 组装（AgentPromptComposer，DB 覆盖优先、classpath 兜底）
        String prompt = promptComposer != null ? promptComposer.composeSystemPrompt() : "";
        prompt = injectToolCatalog(prompt, allowedTools);
        return injectKnowledgeCatalog(prompt);
    }

    /**
     * 技能目录注入：模型开局就知道有哪些技能可查，正文按需 skill(name) / get(target=knowledge) 拉取——懒加载不撑上下文。
     */
    public String injectKnowledgeCatalog(String prompt) {
        if (skillCatalog == null) {
            return prompt;
        }
        try {
            List<AgentSkill> skills = skillCatalog.catalog();
            if (skills == null || skills.isEmpty()) {
                return prompt;
            }
            StringBuilder catalog = new StringBuilder("\n\n## 技能目录（skill(name) 可取全文；引用文件用 skill(name/path)）\n");
            skills.stream()
                .sorted(java.util.Comparator.comparing(AgentSkill::getName))
                .forEach(skill -> catalog.append("- `").append(skill.getName()).append("`：")
                    .append(skill.getDescription() != null ? skill.getDescription() : "").append('\n'));
            catalog.append("开工第一步：skill(\"gaia-workflow-assistant\") 加载完整搭建手册；配置节点前用 get(target=knowledge, nodeType) 查该类型契约。\n");
            return prompt + catalog;
        } catch (Exception e) {
            log.warn("[tool-registry] skill catalog inject failed: {}", e.getMessage());
            return prompt;
        }
    }

    /** 把正文中的目录标记替换为按启用状态渲染的工具目录；无标记（管理员删了/自定义正文）原样返回 */
    private String injectToolCatalog(String prompt, java.util.Set<String> allowedTools) {
        int at = prompt.indexOf(TOOLS_CATALOG_MARKER);
        if (at < 0) {
            return prompt;
        }
        String catalog = renderToolCatalog(allowedTools);
        return prompt.substring(0, at) + catalog + prompt.substring(at + TOOLS_CATALOG_MARKER.length());
    }

    /** 渲染「工具总览」一节：分组标题 + 每工具一句话说明 */
    private String renderToolCatalog(java.util.Set<String> allowedTools) {
        List<AgentToolDefinition> defs = new ArrayList<>();
        for (AgentToolDefinition def : toolDefinitions) {
            if (def.getToolName() == null) {
                continue;
            }
            if (allowedTools != null && !allowedTools.isEmpty() && !allowedTools.contains(def.getToolName())) {
                continue;
            }
            defs.add(def);
        }
        StringBuilder sb = new StringBuilder("## 工具总览（").append(defs.size()).append(" 个）");
        for (ToolGroup group : ToolGroup.values()) {
            List<String> lines = new ArrayList<>();
            for (AgentToolDefinition def : defs) {
                if (group.getCode().equals(toolGroupOf(def.getToolName()))) {
                    lines.add("- `" + def.getToolName() + "` — " + toolSummary(def));
                }
            }
            if (!lines.isEmpty()) {
                sb.append("\n\n").append(groupHeader(group.getCode())).append("\n");
                for (String line : lines) {
                    sb.append(line).append("\n");
                }
            }
        }
        return sb.toString();
    }

    private static String groupHeader(String group) {
        if (ToolGroup.COMMON.getCode().equals(group)) {
            return "### 公共工具（任何任务都用得上）";
        }
        if (ToolGroup.MCP.getCode().equals(group)) {
            return "### MCP 工具（外部 MCP 服务器提供，名称形如 mcp__服务器__工具）";
        }
        return "### 工作流工具（操作会话画布：先 get(target=canvas) 再按需下钻）";
    }

    /** 目录里的一句话说明：优先人工维护的紧凑文案，未知工具退化为 description 首句 */
    private static String toolSummary(AgentToolDefinition def) {
        String curated = TOOL_SUMMARIES.get(def.getToolName());
        if (curated != null) {
            return curated;
        }
        String desc = def.getDescription() == null ? "" : def.getDescription();
        for (String sep : new String[]{"。", "；", "\n"}) {
            int idx = desc.indexOf(sep);
            if (idx > 0) {
                desc = desc.substring(0, idx);
                break;
            }
        }
        if (desc.length() > 80) {
            desc = desc.substring(0, 80) + "…";
        }
        return desc.isEmpty() ? "（见工具 schema）" : desc;
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
        if (toolName == null) return ToolGroup.WORKFLOW.getCode();
        if (toolName.startsWith("mcp__")) return ToolGroup.MCP.getCode();
        switch (toolName) {
            case "skill": case "ask_user": case "todo_write":
            case "web_search": case "web_fetch":
                return ToolGroup.COMMON.getCode();
            default:
                return ToolGroup.WORKFLOW.getCode();
        }
    }

    // ===== 硬编码种子 schema（2026-10-17 工具合并版：16→8） =====
    // 公共组: ask_user / todo_write / skill
    // 工作流组: get / node / edge / run / test_case
    // 下线: get_node / get_node_variables / get_node_knowledge / get_canvas / add_node / update_node /
    //       remove_node / connect_edge / remove_edge / run_workflow / run_node / run_tests / add_test_case

    public JSONArray buildToolsSchema() {
        JSONArray tools = new JSONArray();
        String nodeTypes = "start, end, llm, code, http, condition, branches, loop, variable, string-format, comment";

        // ===== 公共组 =====
        tools.add(func("skill", "按名称加载技能全文。开工第一步：skill(\"gaia-workflow-assistant\") 加载完整搭建手册",
            obj(new String[]{"name"}, new JSONObject[]{ str("name", "技能名", null) })));

        tools.add(func("ask_user", "向用户提问并等待回答，答案会成为新一轮对话（点选/自由输入皆可）。只问三类问题：①缺了会白做的关键信息 ②成品形态关键岔路 ③不可逆/只有用户知道的事。技术路线自己定。超时未答会自动替用户选择 recommended 选项（无则第一个）并继续",
            obj(new String[]{"question"}, new JSONObject[]{
                str("question", "问题（一句话，具体可答）", null),
                arrProp("options", "可选项（可选；最多 5 个，最可能的一项标 recommended=true，超时自动代答用它）", obj(new String[]{"label"}, new JSONObject[]{
                    str("label", "选项文案", null), str("detail", "代价/影响", null),
                    boolProp("recommended", "最可能的选项标 true（最多一项）", null) })),
                intProp("timeoutSeconds", "等待上限秒数 5-300（缺省走后台配置，超时自动代答）", null)
            })));

        tools.add(func("todo_write", "写入/更新任务进度清单（≥3 步先列清单，完成即勾）", obj(
            new String[]{"steps"}, new JSONObject[]{
                arrProp("steps", "全量重写", obj(new String[]{"content"}, new JSONObject[]{
                    str("id", "步骤ID", null), str("content", "内容", null),
                    str("status", "状态", enumVal("pending","in_progress","completed","blocked")) }))})));

        // 联网能力（common 组，工具定义页可启停；web_search 默认关闭，密钥前端配置）
        tools.add(func("web_search", "联网搜索：关键词 → 标题+摘要+链接列表。需要 Tavily API Key（Agent 配置中心·工具定义页配置），未配置时调用会返回开启指引", obj(
            new String[]{"query"}, new JSONObject[]{
                str("query", "搜索关键词", null),
                intProp("max_results", "返回条数（缺省 5，上限 10）", null) })));

        tools.add(func("web_fetch", "抓取网页内容：http/https 地址 → 页面文本（30s 超时，上限 10 万字符）", obj(
            new String[]{"url"}, new JSONObject[]{
                str("url", "目标地址（http/https）", null),
                intProp("max_length", "返回文本最大长度（缺省不限制）", null) })));

        // ===== 工作流组 =====
        tools.add(func("get", "查询画布/单节点配置/变量/节点知识（四合一查询）。一切操作的起点；改节点前先 target=node 看现状", obj(
            new String[]{"target"}, new JSONObject[]{
                str("target", "查询目标", enumVal("canvas","node","variables","knowledge")),
                str("nodeId", "target=node/variables 时必填：节点ID", null),
                str("nodeType", "target=knowledge 时必填：节点类型", null),
            })));

        tools.add(func("node", "节点增/改/删。action=add 时用 type+data（items 批量），action=update 时用 nodeId+data，action=remove 时用 nodeId", obj(
            new String[]{"action"}, new JSONObject[]{
                str("action", "操作", enumVal("add","update","remove")),
                str("type", "action=add 时必填：节点类型", null),
                str("title", "节点标题（可选）", null),
                objProp("data", "业务字段（扁平写法，系统自动 normalize）"),
                str("nodeId", "action=update/remove 时必填：目标节点ID", null),
                objProp("connect", "action=add 时可选：{from, fromPort?, to} 接线"),
                arrProp("items", "批量添加（可选）", obj(new String[]{"type"}, new JSONObject[]{
                    str("type", "节点类型", null), str("title", "标题", null),
                    objProp("data", "业务字段"), objProp("connect", "接线") })),
            })));

        tools.add(func("edge", "连线/断线。connect=连两个既有节点（分支出边必须带 fromPort），remove=删除连线", obj(
            new String[]{"action", "from", "to"}, new JSONObject[]{
                str("action", "操作", enumVal("connect","remove")),
                str("from", "源节点ID", null),
                str("to", "目标节点ID", null),
                str("fromPort", "源端口（仅分支节点需要）", null),
            })));

        tools.add(func("run", "执行。target=workflow 整流试跑会话草稿（真正执行，回 outputs/failedNodes/notExecuted，60s 超时）/ target=node 单节点试跑（mockInputs 模拟上游）/ target=tests 跑测试用例", obj(
            new String[]{"target"}, new JSONObject[]{
                str("target", "执行目标", enumVal("workflow","node","tests")),
                str("nodeId", "target=node/tests 时必填：节点ID", null),
                objProp("inputs", "target=workflow 时的 start 入参"),
                objProp("mockInputs", "target=node 时的上游变量模拟值"),
            })));

        tools.add(func("test_case", "沉淀测试用例（回归资产）。expected 断言算子：exists/equals/contains", obj(
            new String[]{"name", "expected"}, new JSONObject[]{
                str("name", "用例名", null),
                str("nodeId", "节点级用例的目标节点（不传=工作流级）", null),
                objProp("inputs", "工作流级: start 入参；节点级: mock 上游变量"),
                arrProp("expected", "断言列表 [{field, op, value?}]", obj(
                    new String[]{"field", "op"}, new JSONObject[]{
                        str("field", "结果字段", null),
                        str("op", "断言算子", enumVal("exists","equals","contains")),
                        str("value", "期望值", null) })),
            })));

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

    private JSONObject boolProp(String name, String desc, JSONObject extra) {
        JSONObject p = new JSONObject().set("__name", name).set("type", "boolean");
        if (desc != null) p.set("description", desc);
        if (extra != null) p.putAll(extra);
        return p;
    }

    private JSONObject intProp(String name, String desc, JSONObject extra) {
        JSONObject p = new JSONObject().set("__name", name).set("type", "integer");
        if (desc != null) p.set("description", desc);
        if (extra != null) p.putAll(extra);
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

    private JSONObject arrProp(String name, String desc, JSONObject items) {
        JSONObject p = new JSONObject().set("__name", name).set("type", "array").set("description", desc);
        if (items != null) p.set("items", items);
        return p;
    }
}
