package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentArtifact;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.AgentArtifactMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentArtifactService;
import org.springframework.stereotype.Service;

/**
 * Agent 产物 ServiceImpl
 */
@Service
public class AgentArtifactServiceImpl extends ServiceImpl<AgentArtifactMapper, AgentArtifact>
    implements AgentArtifactService {
}
