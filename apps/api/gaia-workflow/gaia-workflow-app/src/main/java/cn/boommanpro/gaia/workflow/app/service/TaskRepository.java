package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.app.domain.testrun.model.TaskInfo;

/**
 * 任务存储库接口
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 15:00
 */
public interface TaskRepository {

    /**
     * 保存任务信息
     *
     * @param taskId 任务ID
     * @param taskInfo 任务信息
     */
    void saveTask(String taskId, TaskInfo taskInfo);

    /**
     * 获取任务信息
     *
     * @param taskId 任务ID
     * @return 任务信息
     */
    TaskInfo getTask(String taskId);

    /**
     * 更新任务信息
     *
     * @param taskId 任务ID
     * @param taskInfo 任务信息
     * @return 是否更新成功
     */
    boolean updateTask(String taskId, TaskInfo taskInfo);

    /**
     * 删除任务信息
     *
     * @param taskId 任务ID
     * @return 是否删除成功
     */
    boolean deleteTask(String taskId);
}

