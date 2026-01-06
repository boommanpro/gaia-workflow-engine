package cn.boommanpro.gaia.workflow.app.domain.testrun.output;

import cn.boommanpro.gaia.workflow.app.domain.testrun.model.Messages;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.NodeReport;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.WorkflowStatus;
import lombok.Data;

import java.util.HashMap;
import java.util.Map;

/**
 * 任务报告输出
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 13:41
 */
@Data
public class TaskReportOutput {
    private WorkflowStatus workflowStatus;
    private Map<String, Object> inputs;
    private Map<String, Object> outputs;
    private Messages messages;
    private Map<String, NodeReport> reports;

    public TaskReportOutput() {
        this.workflowStatus = new WorkflowStatus("idle", false);
        this.inputs = new HashMap<>();
        this.outputs = new HashMap<>();
        this.messages = new Messages();
        this.reports = new HashMap<>();
    }

}
