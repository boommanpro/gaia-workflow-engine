package cn.boommanpro.gaia.workflow.app.domain.testrun.input;

import lombok.Data;

import java.util.Map;

/**
 * 代码功能
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 13:35
 */
@Data
public class TaskRunInput {
    private String schema;
    private Map<String, Object> inputs;
    /** 可选：编辑器试运行时携带工作流编码（运行历史按它归档；缺省从 schema 兜底解析） */
    private String workflowCode;
    /** 可选：触发通道（editor=编辑器试运行默认 / schedule=定时任务）；空按 editor 归档 */
    private String triggerChannel;
    /** 可选：定时任务 ID（triggerChannel=schedule 时落 workflow_run.schedule_id） */
    private Long scheduleId;
}
