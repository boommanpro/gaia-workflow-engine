package cn.boommanpro.gaia.workflow.base.type;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ChainNodeStatus {
    READY("ready", "准备执行"),
    WAIT("wait", "等待执行"),
    RUNNING("running", "正在执行"),
    FINISHED("finished", "执行完成"),
    FINISHED_NORMAL("finished_normal", "正常完成"),
    FINISHED_ABNORMAL("finished_abnormal", "异常完成"),
    FAILED("failed", "执行失败"),
    SKIPPED("skipped", "跳过执行"),
    ;

    private final String code;
    private final String description;

    public static ChainNodeStatus fromChainDepStatus(ChainDepStatus chainDepStatus) {
        switch (chainDepStatus) {
            case WAIT:
                return WAIT;
            case SKIPPED:
                return SKIPPED;
            case READY:
                return READY;
            default:
                throw new IllegalArgumentException("未知的依赖状态");
        }
    }
}
