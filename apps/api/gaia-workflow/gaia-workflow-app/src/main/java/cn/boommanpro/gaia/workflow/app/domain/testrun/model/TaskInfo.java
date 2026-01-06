package cn.boommanpro.gaia.workflow.app.domain.testrun.model;

import lombok.Data;

import java.util.HashMap;
import java.util.Map;

/**
 * 代码功能
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 16:21
 */
@Data
public class TaskInfo {
    private final String schema;
    private final Map<String, Object> inputs;
    private Map<String, Object> outputs;
    private final WorkflowStatus workflowStatus;
    private Map<String, NodeReport> nodeReports;
    private Messages messages;

    public TaskInfo(String schema, Map<String, Object> inputs) {
        this.schema = schema;
        this.inputs = inputs;
        this.outputs = new HashMap<>();
        this.workflowStatus = new WorkflowStatus("idle", false);
        this.nodeReports = new HashMap<>();
        this.messages = new Messages();
    }

}
