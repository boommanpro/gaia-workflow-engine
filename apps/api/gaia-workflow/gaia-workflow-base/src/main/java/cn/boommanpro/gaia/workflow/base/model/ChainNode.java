package cn.boommanpro.gaia.workflow.base.model;

import cn.boommanpro.gaia.workflow.base.type.ChainNodeStatus;
import cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum;
import lombok.Data;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
public abstract class ChainNode implements Serializable {

    protected String id;

    protected String name;

    protected String description;

    protected NodeTypeEnum nodeType;

    protected List<ChainEdge> inwardEdges = new ArrayList<>();

    protected List<ChainEdge> outwardEdges = new ArrayList<>();

    protected ChainNodeStatus status = ChainNodeStatus.READY;

    protected boolean parallel;

    // 执行相关属性
    protected boolean async = false;
    protected NodeCondition condition;

    // 循环执行相关属性
    protected boolean loopEnable = false;           // 是否启用循环执行
    protected long loopIntervalMs = 1000;            // 循环间隔时间（毫秒）
    protected NodeCondition loopBreakCondition;      // 跳出循环的条件
    protected int maxLoopCount = 0;                  // 0 表示不限制循环次数

    public abstract Map<String, Object> execute(Chain chain);

    public List<Parameter> getParameters() {
        return new ArrayList<>();
    }

    public List<Parameter> getOutputParameters() {
        return new ArrayList<>();
    }

    public void addOutwardEdge(ChainEdge edge) {
        if (this.outwardEdges == null) {
            this.outwardEdges = new ArrayList<>();
        }
        this.outwardEdges.add(edge);
    }

    public void addInwardEdge(ChainEdge edge) {
        if (this.inwardEdges == null) {
            this.inwardEdges = new ArrayList<>();
        }
        this.inwardEdges.add(edge);
    }

    protected Map<String, Object> getParametersData(Chain chain) {
        return new HashMap<>();
    }

    /**
     * 设置节点状态为完成
     */
    public void setNodeStatusFinished() {
        if (this.status == ChainNodeStatus.FAILED) {
            this.setStatus(ChainNodeStatus.FINISHED_ABNORMAL);
        } else {
            this.setStatus(ChainNodeStatus.FINISHED);
        }
    }

    /**
     * 通知事件（钩子方法，由Chain调用）
     */
    protected void notifyEvent(Object event) {
        // 默认空实现，由Chain重写
    }
}
