package cn.boommanpro.gaia.workflow.infra.manage.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentMcpServer;
import org.apache.ibatis.annotations.Mapper;

/**
 * MCP 服务器 Mapper
 */
@Mapper
public interface AgentMcpServerMapper extends BaseMapper<AgentMcpServer> {
}
