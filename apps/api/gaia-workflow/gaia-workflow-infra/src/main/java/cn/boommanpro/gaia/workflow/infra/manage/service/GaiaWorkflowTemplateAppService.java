package cn.boommanpro.gaia.workflow.infra.manage.service;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowTemplate;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.GaiaWorkflowTemplateMapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

@Service
public class GaiaWorkflowTemplateAppService extends ServiceImpl<GaiaWorkflowTemplateMapper, GaiaWorkflowTemplate> implements GaiaWorkflowTemplateService {
}
