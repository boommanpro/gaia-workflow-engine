package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentMemory;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.AgentMemoryMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentMemoryService;
import org.springframework.stereotype.Service;

/**
 * 记忆条目 Service 实现
 */
@Service
public class AgentMemoryServiceImpl extends ServiceImpl<AgentMemoryMapper, AgentMemory> implements AgentMemoryService {
}
