package cn.boommanpro.gaia.workflow.app.domain.testrun.model;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
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

    /**
     * 运行中的工作流实例（transient：仅供 cancelTask 发起协作式取消与完成回调
     * 判定取消态，不参与任何序列化）。
     */
    private transient GaiaWorkflow workflowRef;

    public TaskInfo(String schema, Map<String, Object> inputs) {
        this.schema = schema;
        this.inputs = inputs;
        this.outputs = new HashMap<>();
        this.workflowStatus = new WorkflowStatus("idle", false);
        this.nodeReports = new HashMap<>();
        this.messages = new Messages();
    }

}
