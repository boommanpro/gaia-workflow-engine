package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.boommanpro.gaia.workflow.app.agent.context.ContextProvider;
import cn.boommanpro.gaia.workflow.app.agent.context.ContextProviderRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.DefinitionBasedAgent;
import cn.boommanpro.gaia.workflow.app.agent.core.ToolExecutionMode;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmProvider;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmProviderRegistry;
import cn.boommanpro.gaia.workflow.app.agent.llm.OpenAiCompatibleLlmProvider;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.service.AgentProviderConfigService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Agent 装配器 —— 把散落的策略实现归拢成可热插拔的运行体系。
 *
 * <p>约定优于配置：任何 {@link ToolExecutor} / {@link ContextProvider} /
 * {@link LlmProvider} 的 Spring Bean 都会被自动发现并注册，
 * <strong>新增能力不需要改动任何已有代码</strong>（开闭原则）。</p>
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

    private final LlmProviderRegistry llmProviderRegistry;
    private final ToolExecutorRegistry toolExecutorRegistry;
    private final ContextProviderRegistry contextProviderRegistry;
    private final AgentRegistry agentRegistry;

    @Autowired(required = false)
    private List<ToolExecutor> toolExecutors;

    @Autowired(required = false)
    private List<ContextProvider> contextProviders;

    @Autowired(required = false)
    private List<LlmProvider> llmProviders;

    private final OpenAiCompatibleLlmProvider defaultLlmProvider;
    private final AgentConfigService agentConfigService;
    private final AgentProviderConfigService providerConfigService;

    public AgentAssembly(LlmProviderRegistry llmProviderRegistry,
                         ToolExecutorRegistry toolExecutorRegistry,
                         ContextProviderRegistry contextProviderRegistry,
                         AgentRegistry agentRegistry,
                         OpenAiCompatibleLlmProvider defaultLlmProvider,
                         AgentConfigService agentConfigService,
                         AgentProviderConfigService providerConfigService) {
        this.llmProviderRegistry = llmProviderRegistry;
        this.toolExecutorRegistry = toolExecutorRegistry;
        this.contextProviderRegistry = contextProviderRegistry;
        this.agentRegistry = agentRegistry;
        this.defaultLlmProvider = defaultLlmProvider;
        this.agentConfigService = agentConfigService;
        this.providerConfigService = providerConfigService;
    }

    @PostConstruct
    public void init() {
        // 1. LLM 供应商：任何 Spring Bean 形式的 LlmProvider 都会被注册
        // （OpenAiCompatibleLlmProvider 本身即是 @Component，无需再显式注册）
        if (llmProviders != null) {
            llmProviders.forEach(llmProviderRegistry::register);
        }
        // 兜底：若外部没有提供任何供应商 Bean，保证系统至少有一个可用实现
        if (llmProviderRegistry.listAll().isEmpty()) {
            llmProviderRegistry.register(defaultLlmProvider);
        }
        llmProviderRegistry.setDefault(OpenAiCompatibleLlmProvider.PROVIDER_ID);

        // 2. 工具执行器：自动发现的全部注册
        if (toolExecutors != null) {
            toolExecutors.forEach(toolExecutorRegistry::register);
        }
        // v2：全部工具 BACKEND_ONLY / ANY，无前端专属占位器 —— 纯后端执行，前端仅展示

        // 3. 上下文提供者
        if (contextProviders != null) {
            contextProviders.forEach(contextProviderRegistry::register);
        }

        // 4. 内置 Agent（其系统提示词先种进配置中心，便于后台在线修改）
        seedAgentPrompts();
        registerAgent(defaultAssistantDefinition());
        registerAgent(workflowArchitectDefinition());
        registerAgent(workspaceBackendDefinition());
        registerAgent(arkAssistantDefinition());

        log.info("[agent-assembly] ready: {} agents, {} tools, {} context providers, {} llm providers",
            agentRegistry.size(), toolExecutorRegistry.size(),
            contextProviderRegistry.size(), llmProviderRegistry.listAll().size());
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

    /** 注册一个上下文提供者 */
    public void registerContextProvider(ContextProvider provider) {
        contextProviderRegistry.register(provider);
    }

    /** 注册一个 LLM 供应商 */
    public void registerLlmProvider(LlmProvider provider) {
        llmProviderRegistry.register(provider);
    }

    // ---------------- 内置提示词建种 ----------------

    /**
     * 把内置 Agent 的系统提示词种进配置中心。
     *
     * <p>只在 key 不存在时写入 —— 后台改过的提示词永远不会被启动流程覆盖，
     * 这样「改提示词」和「改代码」彻底解耦。</p>
     */
    private void seedAgentPrompts() {
        seedPrompt(ARCHITECT_PROMPT_KEY, "agent/prompt-workflow-architect-zh.md",
            "工作流架构师系统提示词", "内置 Agent 的系统提示词，修改后即刻生效，无需重启");
        seedPrompt(ARCHITECT_PROMPT_KEY + ".en", "agent/prompt-workflow-architect-en.md",
            "Workflow Architect system prompt", "System prompt of a builtin agent; takes effect immediately after editing");
    }

    private void seedPrompt(String key, String resourcePath, String title, String description) {
        try {
            Long existing = agentConfigService.count(new QueryWrapper<AgentConfig>().eq("config_key", key));
            if (existing != null && existing > 0) {
                return;
            }
            String content = readResource(resourcePath);
            if (content == null || content.trim().isEmpty()) {
                return;
            }
            AgentConfig config = new AgentConfig();
            config.setConfigKey(key);
            config.setConfigType("system_prompt");
            config.setTitle(title);
            config.setContent(content);
            config.setDescription(description);
            agentConfigService.save(config);
            log.info("[agent-assembly] seeded system prompt '{}'", key);
        } catch (Exception e) {
            log.warn("[agent-assembly] seed prompt '{}' failed: {}", key, e.getMessage());
        }
    }

    private String readResource(String resourcePath) {
        try (InputStream in = new ClassPathResource(resourcePath).getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("[agent-assembly] read resource '{}' failed: {}", resourcePath, e.getMessage());
            return null;
        }
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
            .llmProviderId(OpenAiCompatibleLlmProvider.PROVIDER_ID)
            .executionMode(ToolExecutionMode.BACKEND)
            .maxTurns(8)
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
            .llmProviderId(OpenAiCompatibleLlmProvider.PROVIDER_ID)
            .toolNames(v2Tools())
            .executionMode(ToolExecutionMode.BACKEND)
            .maxTurns(8)
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
            .llmProviderId(OpenAiCompatibleLlmProvider.PROVIDER_ID)
            .toolNames(v2Tools())
            .executionMode(ToolExecutionMode.BACKEND)
            // 实测 10 轮不够：占位修正+重落版+试运行的常规链路就会触顶截断（话说到一半被掐）
            .maxTurns(18)
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
