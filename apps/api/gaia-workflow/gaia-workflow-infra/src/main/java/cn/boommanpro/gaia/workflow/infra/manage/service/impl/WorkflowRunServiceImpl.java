package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowRun;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.WorkflowRunMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowRunService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

@Service
public class WorkflowRunServiceImpl extends ServiceImpl<WorkflowRunMapper, WorkflowRun>
    implements WorkflowRunService {
}
