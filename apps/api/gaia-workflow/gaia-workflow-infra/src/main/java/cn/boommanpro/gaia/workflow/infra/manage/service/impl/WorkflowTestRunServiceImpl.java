package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowTestRun;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.WorkflowTestRunMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowTestRunService;
import org.springframework.stereotype.Service;

/**
 * 测试用例运行记录 Service 实现
 */
@Service
public class WorkflowTestRunServiceImpl extends ServiceImpl<WorkflowTestRunMapper, WorkflowTestRun> implements WorkflowTestRunService {
}
