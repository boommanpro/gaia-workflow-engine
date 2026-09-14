package cn.boommanpro.gaia.workflow.app.agent.core;

/**
 * 工具执行位置：决定一次 Agent 运行时，工具到底在哪侧执行。
 *
 * <p>历史上本系统的工具执行权完全在前端：后端只发 {@code tool_call} 事件然后挂起，
 * 等浏览器执行完再 POST 回灌结果。这导致「前端对话面板一关，Agent 就跑不动」。</p>
 *
 * <p>引入该枚举后，运行时可以在两种形态间切换：</p>
 * <ul>
 *   <li>{@link #FRONTEND}：兼容旧链路，需要 UI 的工具（画布操作、页面导航）照常下发给前端</li>
 *   <li>{@link #BACKEND}：自治模式，后端自己执行工具并驱动循环，不依赖任何浏览器</li>
 * </ul>
 */
public enum ToolExecutionMode {

    /** 前端执行（旧行为）：后端发 tool_call 事件并等待前端回灌 */
    FRONTEND,

    /** 后端执行（自治）：后端直接跑 ToolExecutor，闭环完成整个推理过程 */
    BACKEND
}
