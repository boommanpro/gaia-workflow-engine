package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowSchedule;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.WorkflowScheduleMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowScheduleService;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class WorkflowScheduleServiceImpl extends ServiceImpl<WorkflowScheduleMapper, WorkflowSchedule>
        implements WorkflowScheduleService {

    @Override
    public boolean casAdvanceNextFire(Long id, LocalDateTime expected, LocalDateTime next) {
        return update(new UpdateWrapper<WorkflowSchedule>()
            .eq("id", id)
            .eq("next_fire_time", expected)
            .set("next_fire_time", next)
            .set("updated_at", LocalDateTime.now()));
    }
}
