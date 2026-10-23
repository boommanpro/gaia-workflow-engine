package cn.boommanpro.gaia.workflow.app.domain.testrun.output;

import cn.boommanpro.gaia.workflow.app.service.WorkflowDslValidator;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 代码功能
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 13:39
 */
@Data
@NoArgsConstructor
public class TaskRunOutput {
    private String taskID;

    /** 运行前校验失败时的 error 级文案（taskID 为空表示任务未启动） */
    private List<String> errors;

    /** 运行前校验的结构化问题清单（level/code/nodeId/message） */
    private List<WorkflowDslValidator.Issue> issues;

    public TaskRunOutput(String taskID) {
        this.taskID = taskID;
    }

    public static TaskRunOutput fail(List<String> errors, List<WorkflowDslValidator.Issue> issues) {
        TaskRunOutput output = new TaskRunOutput();
        output.setErrors(errors);
        output.setIssues(issues);
        return output;
    }
}
