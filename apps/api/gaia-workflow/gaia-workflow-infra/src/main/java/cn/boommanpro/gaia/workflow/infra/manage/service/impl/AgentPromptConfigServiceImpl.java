package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentPromptConfig;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.AgentPromptConfigMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentPromptConfigService;
import org.springframework.stereotype.Service;

/**
 * Agent 人设/规范/压缩提示词配置（IDENTITY/SOUL/AGENTS/COMPACTION） Service 实现
 */
@Service
public class AgentPromptConfigServiceImpl extends ServiceImpl<AgentPromptConfigMapper, AgentPromptConfig> implements AgentPromptConfigService {
}
