package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowTemplate;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.GaiaWorkflowTemplateMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowTemplateService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

@Service
public class GaiaWorkflowTemplateServiceImpl extends ServiceImpl<GaiaWorkflowTemplateMapper, GaiaWorkflowTemplate> implements GaiaWorkflowTemplateService {
}
