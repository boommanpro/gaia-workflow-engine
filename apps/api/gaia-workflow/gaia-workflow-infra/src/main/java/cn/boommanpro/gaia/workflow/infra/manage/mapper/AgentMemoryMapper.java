package cn.boommanpro.gaia.workflow.infra.manage.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentMemory;
import org.apache.ibatis.annotations.Mapper;

/**
 * 记忆条目 Mapper
 */
@Mapper
public interface AgentMemoryMapper extends BaseMapper<AgentMemory> {
}
