package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowNodeRun;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.WorkflowNodeRunMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowNodeRunService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

@Service
public class WorkflowNodeRunServiceImpl extends ServiceImpl<WorkflowNodeRunMapper, WorkflowNodeRun>
    implements WorkflowNodeRunService {
}
