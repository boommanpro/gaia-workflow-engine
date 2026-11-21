package cn.boommanpro.gaia.workflow.infra.manage.mapper;

import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowSchedule;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface WorkflowScheduleMapper extends BaseMapper<WorkflowSchedule> {
}
