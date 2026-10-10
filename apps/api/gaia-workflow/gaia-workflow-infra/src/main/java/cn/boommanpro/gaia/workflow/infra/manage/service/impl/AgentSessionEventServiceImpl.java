package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSessionEvent;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.AgentSessionEventMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionEventService;
import org.springframework.stereotype.Service;

/**
 * Agent 会话事件 ServiceImpl
 */
@Service
public class AgentSessionEventServiceImpl extends ServiceImpl<AgentSessionEventMapper, AgentSessionEvent>
    implements AgentSessionEventService {
}
