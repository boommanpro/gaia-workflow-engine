package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSkill;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.AgentSkillMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSkillService;
import org.springframework.stereotype.Service;

/**
 * Agent 技能（原 node_knowledge 重构） Service 实现
 */
@Service
public class AgentSkillServiceImpl extends ServiceImpl<AgentSkillMapper, AgentSkill> implements AgentSkillService {
}
