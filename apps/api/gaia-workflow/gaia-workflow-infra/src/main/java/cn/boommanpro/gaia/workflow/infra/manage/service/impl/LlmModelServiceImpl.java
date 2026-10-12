package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import cn.boommanpro.gaia.workflow.infra.manage.entity.LlmModel;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.LlmModelMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.LlmModelService;
import org.springframework.stereotype.Service;

/**
 * 模型条目 Service 实现
 */
@Service
public class LlmModelServiceImpl extends ServiceImpl<LlmModelMapper, LlmModel> implements LlmModelService {
}
