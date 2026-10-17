package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowTestCase;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.WorkflowTestCaseMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowTestCaseService;
import org.springframework.stereotype.Service;

/**
 * 工作流测试用例（节点级/工作流级） Service 实现
 */
@Service
public class WorkflowTestCaseServiceImpl extends ServiceImpl<WorkflowTestCaseMapper, WorkflowTestCase> implements WorkflowTestCaseService {
}
