package cn.boommanpro.gaia.workflow.base.type;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 统一的执行状态枚举
 * 用于替代ChainNodeStatus、NodeStatus、WorkflowStatusEnum等重复的状态枚举
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
@Getter
@AllArgsConstructor
public enum ExecutionStatus {

    // === 等待状态 ===
    PENDING("pending", "等待中"),
    WAIT("wait", "等待执行"),
    READY("ready", "准备执行"),
    IDLE("idle", "空闲"),

    // === 执行中状态 ===
    PROCESSING("processing", "处理中"),
    RUNNING("running", "正在执行"),

    // === 成功状态 ===
    SUCCEEDED("succeeded", "成功"),
    SUCCESS("success", "成功"),
    FINISHED("finished", "执行完成"),
    FINISHED_NORMAL("finished_normal", "正常结束"),

    // === 失败状态 ===
    FAILED("failed", "失败"),
    FAIL("fail", "失败"),
    ERROR("error", "发生错误"),
    FINISHED_ABNORMAL("finished_abnormal", "错误结束"),

    // === 其他状态 ===
    SKIPPED("skipped", "跳过执行"),
    CANCELED("canceled", "已取消");

    private final String code;
    private final String description;

    /**
     * 根据代码值获取枚举
     *
     * @param code 代码值
     * @return 对应的枚举，如果未找到则返回PENDING
     */
    public static ExecutionStatus fromCode(String code) {
        if (code == null) {
            return PENDING;
        }

        for (ExecutionStatus status : values()) {
            if (status.getCode().equals(code)) {
                return status;
            }
        }
        return PENDING;
    }

    /**
     * 判断是否为终态（不会再变化的状态）
     *
     * @return 是否为终态
     */
    public boolean isTerminal() {
        return this == SUCCEEDED || this == SUCCESS || this == FINISHED ||
               this == FINISHED_NORMAL || this == FAILED || this == FAIL ||
               this == ERROR || this == FINISHED_ABNORMAL ||
               this == SKIPPED || this == CANCELED;
    }

    /**
     * 判断是否为成功状态
     *
     * @return 是否为成功状态
     */
    public boolean isSuccess() {
        return this == SUCCEEDED || this == SUCCESS || this == FINISHED ||
               this == FINISHED_NORMAL;
    }

    /**
     * 判断是否为失败状态
     *
     * @return 是否为失败状态
     */
    public boolean isFailure() {
        return this == FAILED || this == FAIL || this == ERROR ||
               this == FINISHED_ABNORMAL;
    }

    /**
     * 判断是否为运行中状态
     *
     * @return 是否为运行中状态
     */
    public boolean isRunning() {
        return this == PROCESSING || this == RUNNING;
    }

    /**
     * 判断是否为等待状态
     *
     * @return 是否为等待状态
     */
    public boolean isWaiting() {
        return this == PENDING || this == WAIT || this == READY || this == IDLE;
    }

    /**
     * 转换为兼容的NodeStatus字符串值（用于server模块）
     *
     * @return NodeStatus兼容的值
     */
    public String toNodeStatusValue() {
        switch (this) {
            case PENDING:
            case WAIT:
            case READY:
            case IDLE:
                return "pending";
            case PROCESSING:
            case RUNNING:
                return "processing";
            case SUCCEEDED:
            case SUCCESS:
            case FINISHED:
            case FINISHED_NORMAL:
                return "succeeded";
            case FAILED:
            case FAIL:
            case ERROR:
            case FINISHED_ABNORMAL:
                return "failed";
            case SKIPPED:
            case CANCELED:
                return "canceled";
            default:
                return "pending";
        }
    }
}

