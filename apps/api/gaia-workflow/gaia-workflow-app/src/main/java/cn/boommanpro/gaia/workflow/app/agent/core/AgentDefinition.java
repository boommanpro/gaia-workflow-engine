package cn.boommanpro.gaia.workflow.app.agent.core;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Agent 定义 —— 「可管理的 Agent」的数据描述。
 *
 * <p>过去系统的行为是<strong>提示词工程</strong>驱动的：一份写死的系统提示词
 * （agent/prompt-zh.md）+ 一个写死的工具集合 + 一段写死的上下文拼装顺序，
 * 三者焊死在 {@code AgentChatService} 里，想加一种 Agent 只能改代码重新发版。</p>
 *
 * <p>现在把「一个 Agent 是什么」抽成这份纯数据定义：</p>
 * <ul>
 *   <li>{@code toolNames} —— 用哪些工具（策略注册中心的 key）</li>
 *   <li>{@code contextProviderIds} —— 注入哪些上下文（策略注册中心的 key）</li>
 *   <li>{@code llmProviderId} —— 用哪个模型供应商</li>
 *   <li>{@code maxTurns} —— 自治循环最多几轮，防止跑飞</li>
 *   <li>{@code executionMode} —— 工具在前端还是后端执行</li>
 * </ul>
 *
 * <p>定义可以来自 Java 配置、数据库（agent_config）或运行时 API，
 * 注册进 {@link AgentRegistry} 即刻生效 —— 这就是「热插拔」。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentDefinition {

    /** 全局唯一标识，如 workflow-architect */
    private String id;

    /** 展示名 */
    private String name;

    /** 用途说明，给人看也给路由选择时看 */
    private String description;

    /** 系统提示词；为空则使用 {@code systemPromptConfigKey} 从配置中心取 */
    private String systemPrompt;

    /** 配置中心里的提示词 key，如 system_prompt.default */
    private String systemPromptConfigKey;

    /** 使用的 LLM 供应商 id，为空用默认 */
    private String llmProviderId;

    /** 该 Agent 可用的工具名集合 */
    @Builder.Default
    private Set<String> toolNames = new LinkedHashSet<>();

    /** 该 Agent 启用的上下文提供者 id（为空表示启用全部） */
    @Builder.Default
    private List<String> contextProviderIds = new ArrayList<>();

    /** 自治循环最大轮次，防御性设计，避免模型空转 */
    @Builder.Default
    private int maxTurns = 8;

    /** 工具在哪侧执行 */
    @Builder.Default
    private ToolExecutionMode executionMode = ToolExecutionMode.FRONTEND;

    /** 温度；为 null 表示沿用模型配置 */
    private Double temperature;

    /** 是否启用，禁用后不参与路由 */
    @Builder.Default
    private boolean enabled = true;

    /** 排序，路由冲突时取小的 */
    @Builder.Default
    private int sortOrder = 100;

    /** 定义来源，便于排查：builtin / database / api */
    @Builder.Default
    private String source = "builtin";

    // ===== 执行引擎选择（双引擎架构） =====

    /**
     * 执行引擎：local=自研编排（AgentRuntime，默认）、ark=火山方舟 Managed Agents 托管。
     * 为空按 local 处理，存量定义零改造。
     */
    @Builder.Default
    private String engine = "local";

    /** 方舟 Agent 资源 ID（engine=ark 必填，形如 agent-20260812081435-xxxxx） */
    private String arkAgentId;

    /** 固定使用的方舟 Agent 版本号；为空则创建 Session 时使用最新版本 */
    private Integer arkAgentVersion;

    /** 是否要求方舟侧启用沙箱内置工具集（bash/文件/web 等，按次计费）；本地定义只是防御性声明，远端 Agent 需同步配置 */
    @Builder.Default
    private boolean arkSandboxTools = false;

}
