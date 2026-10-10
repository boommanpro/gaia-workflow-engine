package cn.boommanpro.gaia.workflow.infra.manage.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolCallLog;
import org.apache.ibatis.annotations.Mapper;

/**
 * 工具调用指标 Mapper
 */
@Mapper
public interface AgentToolCallLogMapper extends BaseMapper<AgentToolCallLog> {
}
