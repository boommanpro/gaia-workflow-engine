package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowLog;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.GaiaWorkflowLogMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowLogService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

@Service
public class GaiaWorkflowLogServiceImpl extends ServiceImpl<GaiaWorkflowLogMapper, GaiaWorkflowLog> implements GaiaWorkflowLogService {
}
