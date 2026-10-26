package cn.boommanpro.gaia.workflow.app.domain.testrun.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 节点报告
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 13:41
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NodeReport {
    private String id;
    private String status;
    private Long startTime;
    private Long endTime;
    private Long timeCost;
    /** 执行线程追加、report 轮询线程遍历：CopyOnWriteArrayList 保证并发下序列化不抛 CME */
    private List<Snapshot> snapshots = new CopyOnWriteArrayList<>();
}

