package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.GaiaWorkflowMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

@Service
public class GaiaWorkflowServiceImpl extends ServiceImpl<GaiaWorkflowMapper, GaiaWorkflow> implements GaiaWorkflowService {
}
