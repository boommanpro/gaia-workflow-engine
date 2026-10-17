package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSkillFile;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.AgentSkillFileMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSkillFileService;
import org.springframework.stereotype.Service;

@Service
public class AgentSkillFileServiceImpl extends ServiceImpl<AgentSkillFileMapper, AgentSkillFile> implements AgentSkillFileService {
}
