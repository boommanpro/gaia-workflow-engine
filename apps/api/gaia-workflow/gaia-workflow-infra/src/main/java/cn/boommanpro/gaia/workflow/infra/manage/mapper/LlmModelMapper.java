package cn.boommanpro.gaia.workflow.infra.manage.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.boommanpro.gaia.workflow.infra.manage.entity.LlmModel;
import org.apache.ibatis.annotations.Mapper;

/**
 * 模型条目 Mapper
 */
@Mapper
public interface LlmModelMapper extends BaseMapper<LlmModel> {
}
