package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.GaiaWorkflowVersionMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

@Service
public class GaiaWorkflowVersionServiceImpl extends ServiceImpl<GaiaWorkflowVersionMapper, GaiaWorkflowVersion> implements GaiaWorkflowVersionService {
}
