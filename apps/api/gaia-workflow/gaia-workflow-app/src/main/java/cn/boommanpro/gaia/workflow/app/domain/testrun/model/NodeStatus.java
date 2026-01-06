package cn.boommanpro.gaia.workflow.app.domain.testrun.model;

/**
 * 节点状态枚举
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 16:00
 */
public enum NodeStatus {
    /**
     * 等待中
     */
    PENDING("pending"),

    /**
     * 处理中
     */
    PROCESSING("processing"),

    /**
     * 成功
     */
    SUCCEEDED("succeeded"),

    /**
     * 失败
     */
    FAILED("failed"),

    /**
     * 取消
     */
    CANCELED("canceled"),

    /**
     * 成功
     */
    SUCCESS("success"),

    /**
     * 失败
     */
    FAIL("fail");

    private final String value;

    NodeStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * 根据值获取枚举
     *
     * @param value 值
     * @return 枚举
     */
    public static NodeStatus fromValue(String value) {
        for (NodeStatus status : NodeStatus.values()) {
            if (status.getValue().equals(value)) {
                return status;
            }
        }
        return PENDING;
    }
}

