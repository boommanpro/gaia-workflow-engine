package cn.boommanpro.gaia.workflow.infra.manage.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSkill;
import org.apache.ibatis.annotations.Mapper;

/**
 * Agent 技能（原 node_knowledge 重构） Mapper
 */
@Mapper
public interface AgentSkillMapper extends BaseMapper<AgentSkill> {
}
