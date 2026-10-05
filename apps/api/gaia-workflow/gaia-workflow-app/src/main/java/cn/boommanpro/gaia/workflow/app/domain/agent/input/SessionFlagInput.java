package cn.boommanpro.gaia.workflow.app.domain.agent.input;

import lombok.Data;

/**
 * 会话列表标记更新（置顶 / 归档），只更新非 null 字段
 */
@Data
public class SessionFlagInput {
    private Boolean pinned;
    private Boolean archived;
}
