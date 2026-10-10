package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolCallLog;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.AgentToolCallLogMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolCallLogService;
import org.springframework.stereotype.Service;

/**
 * 工具调用指标 ServiceImpl
 */
@Service
public class AgentToolCallLogServiceImpl extends ServiceImpl<AgentToolCallLogMapper, AgentToolCallLog>
    implements AgentToolCallLogService {
}
