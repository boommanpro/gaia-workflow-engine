package cn.boommanpro.gaia.workflow.base.model;

import cn.boommanpro.gaia.workflow.base.type.ChainNodeStatus;
import cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 节点执行信息
 * 记录节点的执行状态和相关信息
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
@Data
public class ChainNodeExecuteInfo {

    private String id;
    private String executeInfoId;
    private NodeTypeEnum type;
    private String branch;
    private ChainNodeStatus status;
    private Long triggerTime;
    private Long startTime;
    private Long endTime;
    private String inputsResult;
    private String executeResult;
    private String outputResult;
    private List<String> inwardEdges = new ArrayList<>();
    private String exception;

    public void trigger() {
        if (triggerTime == null) {
            triggerTime = System.currentTimeMillis();
        }
    }

    public void setStartTime(Long startTime) {
        if (this.startTime != null) {
            return;
        }
        this.startTime = startTime;
    }
}
