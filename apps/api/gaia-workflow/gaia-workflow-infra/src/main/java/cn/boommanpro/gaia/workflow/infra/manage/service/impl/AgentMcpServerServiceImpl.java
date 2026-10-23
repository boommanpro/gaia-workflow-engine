package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentMcpServer;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.AgentMcpServerMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentMcpServerService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * MCP 服务器 Service 实现
 */
@Service
public class AgentMcpServerServiceImpl extends ServiceImpl<AgentMcpServerMapper, AgentMcpServer>
    implements AgentMcpServerService {
}
