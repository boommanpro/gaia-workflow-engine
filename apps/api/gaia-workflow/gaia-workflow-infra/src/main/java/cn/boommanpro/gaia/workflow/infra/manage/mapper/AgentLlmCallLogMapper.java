package cn.boommanpro.gaia.workflow.infra.manage.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentLlmCallLog;
import org.apache.ibatis.annotations.Mapper;

/**
 * LLM 调用账本 Mapper
 */
@Mapper
public interface AgentLlmCallLogMapper extends BaseMapper<AgentLlmCallLog> {
}
