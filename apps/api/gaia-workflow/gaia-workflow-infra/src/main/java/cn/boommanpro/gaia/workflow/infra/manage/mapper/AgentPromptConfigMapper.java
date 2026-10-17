package cn.boommanpro.gaia.workflow.infra.manage.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentPromptConfig;
import org.apache.ibatis.annotations.Mapper;

/**
 * Agent 人设/规范/压缩提示词配置（IDENTITY/SOUL/AGENTS/COMPACTION） Mapper
 */
@Mapper
public interface AgentPromptConfigMapper extends BaseMapper<AgentPromptConfig> {
}
