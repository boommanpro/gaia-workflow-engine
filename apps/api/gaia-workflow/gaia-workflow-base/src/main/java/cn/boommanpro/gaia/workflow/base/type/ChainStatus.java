package cn.boommanpro.gaia.workflow.base.type;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ChainStatus {
    READY("ready", "未开始执行"),
    RUNNING("running", "已开始执行，执行中"),
    SKIPPED("skipped", "跳过"),
    ERROR("error", "发生错误"),
    FINISHED_NORMAL("finished_normal", "正常结束"),
    FINISHED_ABNORMAL("finished_abnormal", "错误结束"),
    SUSPEND("suspend", "暂停执行"),
    ;

    private final String code;
    private final String description;
}
