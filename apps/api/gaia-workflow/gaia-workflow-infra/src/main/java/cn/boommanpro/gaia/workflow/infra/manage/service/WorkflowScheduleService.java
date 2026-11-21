package cn.boommanpro.gaia.workflow.infra.manage.service;

import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowSchedule;
import com.baomidou.mybatisplus.extension.service.IService;

import java.time.LocalDateTime;

public interface WorkflowScheduleService extends IService<WorkflowSchedule> {

    /**
     * CAS 推进下次触发时间：仅当 next_fire_time 仍等于期望旧值时更新。
     * 调度扫描用它在触发前抢占，防止同一到期点被重复消费。
     *
     * @return true=抢占成功（本次触发归我）；false=已被别人推进
     */
    boolean casAdvanceNextFire(Long id, LocalDateTime expected, LocalDateTime next);
}
