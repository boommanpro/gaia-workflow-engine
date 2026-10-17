package cn.boommanpro.gaia.workflow.infra.manage.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowTestRun;
import org.apache.ibatis.annotations.Mapper;

/**
 * 测试用例运行记录 Mapper
 */
@Mapper
public interface WorkflowTestRunMapper extends BaseMapper<WorkflowTestRun> {
}
