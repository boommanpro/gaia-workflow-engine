package cn.boommanpro.gaia.workflow.infra.manage.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowTestCase;
import org.apache.ibatis.annotations.Mapper;

/**
 * 工作流测试用例（节点级/工作流级） Mapper
 */
@Mapper
public interface WorkflowTestCaseMapper extends BaseMapper<WorkflowTestCase> {
}
