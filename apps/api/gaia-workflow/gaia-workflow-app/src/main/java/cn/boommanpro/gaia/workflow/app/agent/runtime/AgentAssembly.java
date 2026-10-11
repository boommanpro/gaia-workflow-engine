package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.DefinitionBasedAgent;
import cn.boommanpro.gaia.workflow.app.agent.core.ToolExecutionMode;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.service.AgentProviderConfigService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Agent 装配器 —— 把散落的策略实现归拢成可热插拔的运行体系。
 *
 * <p>约定优于配置：任何 {@link ToolExecutor} 的 Spring Bean
 * 都会被自动发现并注册，<strong>新增能力不需要改动任何已有代码</strong>（开闭原则）。</p>
 *
 * <p>同时它也提供运行时注册 API，
 * 供管理界面或外部集成在某个时刻动态挂载/卸载 Agent。</p>
 */
@Slf4j
@Component
public class AgentAssembly {

    /** 工作流架构师的系统提示词在配置中心的 key（后台可在线修改，改完即生效） */
    public static final String ARCHITECT_PROMPT_KEY = "system_prompt.workflow-architect";

    /** 方舟托管 Agent 的内置定义 ID（与 provider_config:ark 的 defaultAgentId 呼应） */
    public static final String ARK_ASSISTANT_ID = "ark-assistant";

    private final ToolExecutorRegistry toolExecutorRegistry;
    private final AgentRegistry agentRegistry;

    @Autowired(required = false)
    private List<ToolExecutor> toolExecutors;

    private final AgentProviderConfigService providerConfigService;

    public AgentAssembly(ToolExecutorRegistry toolExecutorRegistry,
                         AgentRegistry agentRegistry,
                         AgentProviderConfigService providerConfigService) {
        this.toolExecutorRegistry = toolExecutorRegistry;
        this.agentRegistry = agentRegistry;
        this.providerConfigService = providerConfigService;
    }

    @PostConstruct
    public void init() {
        // 1. 工具执行器：自动发现的全部注册
        // （模型接入已收敛到 agentscope 引擎 + agent_config.llm_config，LlmProvider 体系随旧引擎移除）
        if (toolExecutors != null) {
            toolExecutors.forEach(toolExecutorRegistry::register);
        }
        // v2：全部工具 BACKEND_ONLY / ANY，无前端专属占位器 —— 纯后端执行，前端仅展示

        // 2. 内置 Agent（提示词的播种与版本同步由 AgentToolRegistry.ensureSeeded 统一负责：
        //    @PostConstruct 阶段数据源未就绪，DB 写入会白失败）
        registerAgent(defaultAssistantDefinition());
        registerAgent(workflowArchitectDefinition());
        registerAgent(workspaceBackendDefinition());
        registerAgent(arkAssistantDefinition());

        log.info("[agent-assembly] ready: {} agents, {} tools",
            agentRegistry.size(), toolExecutorRegistry.size());
    }

    // ---------------- 运行时热插拔 API ----------------

    /** 注册/替换一个 Agent */
    public void registerAgent(AgentDefinition definition) {
        agentRegistry.register(new DefinitionBasedAgent(definition));
    }

    /** 注册一个工具执行器（覆盖同名实现） */
    public void registerToolExecutor(ToolExecutor executor) {
        toolExecutorRegistry.register(executor);
    }

    // ---------------- 内置 Agent 定义 ----------------
    /**
     * 默认助手：v2 起与工作区助手同一套后端自治工具（旧前端执行链路已退役）。
     */
    private AgentDefinition defaultAssistantDefinition() {
        return AgentDefinition.builder()
            .id("default-assistant")
            .name("默认助手")
            .description("通用助手：工具全部在服务端执行，前端仅展示")
            .source("builtin")
            // 必须显式收敛到 v2 工具集：未设名单时会把 DB 里全部 enabled 的工具
            // （含历史遗留的 v1 前端工具）灌给模型
            .toolNames(v2Tools())
            .executionMode(ToolExecutionMode.BACKEND)
            .sortOrder(10)
            .build();
    }

    /** v2 工具全集（dsh 命名：读 7 + edit + run + 落版 3 + todo） */
    private Set<String> v2Tools() {
        Set<String> tools = new LinkedHashSet<>();
        // 读
        tools.add("list_workflows");
        tools.add("read_workflow");
        tools.add("read_node");
        tools.add("list_runs");
        tools.add("list_templates");
        tools.add("search_knowledge");
        tools.add("get_node_schema");
        // 编辑 / 执行
        tools.add("edit_workflow");
        tools.add("run_workflow");
        // 落版 / 生命周期
        tools.add("write_workflow");
        tools.add("save_workflow");
        tools.add("delete_workflow");
        // 元
        tools.add("todo_write");
        return tools;
    }

    /**
     * 工作流架构师：自治模式下的主力。
     * 只用服务端能力，因此关掉前端对话也能独立完成「需求 → 工作流落版」。
     */
    private AgentDefinition workflowArchitectDefinition() {
        return AgentDefinition.builder()
            .id("workflow-architect")
            .name("工作流架构师（自治）")
            .description("不依赖浏览器，直接把需求变成已落版的工作流")
            .source("builtin")
            .systemPromptConfigKey(ARCHITECT_PROMPT_KEY)
            .toolNames(v2Tools())
            .executionMode(ToolExecutionMode.BACKEND)
            .sortOrder(20)
            .build();
    }

    /**
     * 工作区助手（后端自治）：AI 工作区对话的默认 Agent。
     * 工具全部在后端执行（画布操作落在服务端草稿文档上），
     * 因此关掉窗口对话照常跑完，多窗口共享同一份会话与产物。
     */
    private AgentDefinition workspaceBackendDefinition() {
        return AgentDefinition.builder()
            .id("workspace-backend")
            .name("工作区助手（后端自治）")
            .description("前端仅展示、后端自治的通用助手：对话循环与工具执行都在服务端")
            .source("builtin")
            .toolNames(v2Tools())
            .executionMode(ToolExecutionMode.BACKEND)
            .sortOrder(5)
            .build();
    }

    /**
     * 方舟托管助手：对话循环托管给火山方舟 Managed Agents（engine=ark）。
     *
     * <p>远端绑定与连接参数来自 {@code provider_config:ark}（apiKey / environmentId /
     * defaultAgentId）。v2 工具全部可在服务端执行，Custom Tool 协议都有执行方。</p>
     *
     * <p>sortOrder 给大（50）：不参与隐式路由，仅当 provider_config:ark.defaultAgentId
     * 指向本定义（或调用方显式指定 agentId）时被选中。</p>
     */
    private AgentDefinition arkAssistantDefinition() {
        String remoteAgentId;
        try {
            remoteAgentId = providerConfigService.getArkConfig().getDefaultAgentId();
        } catch (Exception e) {
            remoteAgentId = null;
        }

        return AgentDefinition.builder()
            .id(ARK_ASSISTANT_ID)
            .name("方舟托管助手")
            .description("对话循环托管给火山方舟 Managed Agents：模型编排/沙箱/用量统计在方舟侧，"
                + "本地负责会话映射、事件翻译与自定义工具回传")
            .source("builtin")
            .engine("ark")
            .arkAgentId(remoteAgentId)
            .toolNames(v2Tools())
            .executionMode(ToolExecutionMode.BACKEND)
            .sortOrder(50)
            .build();
    }
}
