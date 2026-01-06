package cn.boommanpro.gaia.workflow.app.domain.testrun.model;

import lombok.Data;

import java.util.HashMap;
import java.util.Map;

/**
 * 代码功能
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 16:17
 */
@Data
public  class SnapshotData {
    private String nodeID;
    private Map<String, Object> inputs;
    private Map<String, Object> outputs;
    private Object data;
    private String branch;
    private String error;

    public SnapshotData() {
        this.inputs = new HashMap<>();
        this.outputs = new HashMap<>();
    }
}
