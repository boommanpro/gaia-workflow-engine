package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentLlmCallLog;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.AgentLlmCallLogMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentLlmCallLogService;
import org.springframework.stereotype.Service;

/**
 * LLM 调用账本 ServiceImpl
 */
@Service
public class AgentLlmCallLogServiceImpl extends ServiceImpl<AgentLlmCallLogMapper, AgentLlmCallLog>
    implements AgentLlmCallLogService {
}
