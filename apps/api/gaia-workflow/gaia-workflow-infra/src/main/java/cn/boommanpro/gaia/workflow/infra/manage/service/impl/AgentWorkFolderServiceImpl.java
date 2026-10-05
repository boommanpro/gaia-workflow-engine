package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentWorkFolder;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.AgentWorkFolderMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentWorkFolderService;
import org.springframework.stereotype.Service;

/**
 * 工作空间文件夹 Service 实现
 */
@Service
public class AgentWorkFolderServiceImpl extends ServiceImpl<AgentWorkFolderMapper, AgentWorkFolder> implements AgentWorkFolderService {
}
