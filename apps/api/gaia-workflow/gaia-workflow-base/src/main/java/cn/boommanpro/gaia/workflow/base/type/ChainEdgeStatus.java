package cn.boommanpro.gaia.workflow.base.type;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ChainEdgeStatus {
    READY("READY", "准备就绪"),
    TRUE("TRUE", "成功"),
    FALSE("FALSE", "失败"),
    SKIPPED("SKIPPED", "跳过"),
    ;
    private final String code;
    private final String description;
}
