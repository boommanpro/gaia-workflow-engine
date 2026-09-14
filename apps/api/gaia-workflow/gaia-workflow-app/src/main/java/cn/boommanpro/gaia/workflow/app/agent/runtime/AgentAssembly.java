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
import cn.boommanpro.gaia.workflow.app.agent.tool.impl.FrontendUiToolExecutor;
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

    public AgentAssembly(LlmProviderRegistry llmProviderRegistry,
                         ToolExecutorRegistry toolExecutorRegistry,
                         ContextProviderRegistry contextProviderRegistry,
                         AgentRegistry agentRegistry,
                         OpenAiCompatibleLlmProvider defaultLlmProvider,
                         AgentConfigService agentConfigService) {
        this.llmProviderRegistry = llmProviderRegistry;
        this.toolExecutorRegistry = toolExecutorRegistry;
        this.contextProviderRegistry = contextProviderRegistry;
        this.agentRegistry = agentRegistry;
        this.defaultLlmProvider = defaultLlmProvider;
        this.agentConfigService = agentConfigService;
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
        // 显式声明「只能在浏览器里跑」的工具，自治模式下会被自动过滤
        toolExecutorRegistry.register(new FrontendUiToolExecutor("canvas", "画布节点操作（需要浏览器画布）"));
        toolExecutorRegistry.register(new FrontendUiToolExecutor("navigate", "页面跳转（需要浏览器）"));

        // 3. 上下文提供者
        if (contextProviders != null) {
            contextProviders.forEach(contextProviderRegistry::register);
        }

        // 4. 内置 Agent（其系统提示词先种进配置中心，便于后台在线修改）
        seedAgentPrompts();
        registerAgent(defaultAssistantDefinition());
        registerAgent(workflowArchitectDefinition());

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
     * 默认助手：保持历史行为 —— 工具交给前端执行，UI 在场时一切照旧。
     */
    private AgentDefinition defaultAssistantDefinition() {
        return AgentDefinition.builder()
            .id("default-assistant")
            .name("默认助手")
            .description("沿用历史行为的通用助手：工具调用交由前端执行")
            .source("builtin")
            .llmProviderId(OpenAiCompatibleLlmProvider.PROVIDER_ID)
            .executionMode(ToolExecutionMode.FRONTEND)
            .maxTurns(8)
            .sortOrder(10)
            .build();
    }

    /**
     * 工作流架构师：自治模式下的主力。
     * 只用服务端能力，因此关掉前端对话也能独立完成「需求 → 工作流落版」。
     */
    private AgentDefinition workflowArchitectDefinition() {
        Set<String> tools = new LinkedHashSet<>();
        tools.add("query");
        tools.add("manage");
        tools.add("applyWorkflow");

        return AgentDefinition.builder()
            .id("workflow-architect")
            .name("工作流架构师（自治）")
            .description("不依赖浏览器，直接把需求变成已落版的工作流")
            .source("builtin")
            .systemPromptConfigKey(ARCHITECT_PROMPT_KEY)
            .llmProviderId(OpenAiCompatibleLlmProvider.PROVIDER_ID)
            .toolNames(tools)
            .executionMode(ToolExecutionMode.BACKEND)
            .maxTurns(6)
            .sortOrder(20)
            .build();
    }
}
