package cn.boommanpro.gaia.workflow.app.agent.core;

/**
 * 工具执行面：声明一个工具「在哪一侧能跑」。
 *
 * <p>这是让同一个 Agent 既能陪用户在 UI 里操作、又能在无头环境下自治的关键元数据。
 * 例如 {@code canvas.addNode} 需要真实画布，只能 {@link #FRONTEND}；
 * 而 {@code query.workflows}、{@code applyWorkflow} 纯后端能力，两者皆可。</p>
 *
 * <p>运行时据此决定：能本地跑就本地跑，跑不了的退回前端或明确告知模型不可用，
 * 而不是让整个循环卡死等待一个永远不会来的回灌。</p>
 */
public enum ExecutionSurface {

    /** 只能在前端执行（依赖画布、路由、用户交互） */
    FRONTEND_ONLY,

    /** 只能在后端执行（内部能力，前端没有上下文） */
    BACKEND_ONLY,

    /** 两侧都能执行，优先后端（自治时不等前端） */
    ANY
}
