package cn.boommanpro.gaia.workflow.app.domain.testrun.output;

import lombok.Data;
import lombok.NoArgsConstructor;

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

    public TaskRunOutput(String taskID) {
        this.taskID = taskID;
    }
}
