package cn.boommanpro.gaia.workflow.app.executor;

/**
 * 测试调用日志记录器接口
 * 用于桥接Gaia工作流模块和Spring Boot服务
 */
public interface TestCallLogRecorder {

    /**
     * 记录测试调用日志
     *
     * @param workflowCode 工作流编码
     * @param versionId 版本ID
     * @param workflowContent 工作流内容
     * @param costTime 耗时(毫秒)
     * @param execParam 执行参数
     * @param execStatus 执行状态
     * @param reports 执行报告
     * @param callResult 调用结果
     * @param errorMessage 错误信息
     */
    void recordTestCallLog(String workflowCode, Long versionId, String workflowContent,
                          Long costTime, String execParam, String execStatus,
                          String reports, String callResult, String errorMessage);
}
