package cn.boommanpro.gaia.workflow.app.agent.tool;

/**
 * 工具结果统一错误码（对齐 deepseek-harness 的错误分类思想）。
 *
 * <p>调用方（运行时熔断、指标采集、模型自修复提示）依据错误码而非文案决策：
 * {@code INVALID_ARGS} 是模型参数问题，错误信息里带修复指引，模型通常一轮可自修；
 * {@code STALE_REVISION} 是并发写冲突，模型需重读状态后重放操作；
 * {@code EXEC_ERROR} 是执行环境问题，可提示重试一次。</p>
 */
public enum ToolErrorCode {

    /** 参数不符合工具 schema（附 path 级违规清单） */
    INVALID_ARGS,

    /** 目标资源不存在（workflowCode / nodeId / nodeType 等） */
    NOT_FOUND,

    /** baseRevision 与当前 revision 不一致（并发修改，需重读） */
    STALE_REVISION,

    /** 被权限策略 / 用户确认拒绝 */
    REJECTED_POLICY,

    /** 执行过程异常 */
    EXEC_ERROR,

    /** 执行超时 */
    TIMEOUT,

    /** 当前执行面不可用（前端专属工具在自治模式下） */
    UNAVAILABLE_SURFACE,

    /** 未注册的工具 */
    UNKNOWN_TOOL
}
