package cn.boommanpro.gaia.workflow.app.executor;

import cn.boommanpro.gaia.workflow.app.domain.testrun.input.TaskRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.TaskInfo;

/**
 * 异步工作流执行器接口
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 16:10
 */
public interface AsyncWorkflowExecutor {

    /**
     * 异步执行工作流
     *
     * @param taskId 任务ID
     * @param taskInfo 任务信息
     * @param input 工作流输入参数
     */
    void executeAsync(String taskId, TaskInfo taskInfo, TaskRunInput input);
}

