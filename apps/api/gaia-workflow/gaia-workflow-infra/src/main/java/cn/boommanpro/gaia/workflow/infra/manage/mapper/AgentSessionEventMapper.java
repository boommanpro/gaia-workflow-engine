package cn.boommanpro.gaia.workflow.infra.manage.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSessionEvent;
import org.apache.ibatis.annotations.Mapper;

/**
 * Agent 会话事件 Mapper
 */
@Mapper
public interface AgentSessionEventMapper extends BaseMapper<AgentSessionEvent> {
}
