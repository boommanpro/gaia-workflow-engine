package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSkillHistory;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.AgentSkillHistoryMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSkillHistoryService;
import org.springframework.stereotype.Service;

@Service
public class AgentSkillHistoryServiceImpl extends ServiceImpl<AgentSkillHistoryMapper, AgentSkillHistory> implements AgentSkillHistoryService {
}
