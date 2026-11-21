package cn.boommanpro.gaia.workflow.app.schedule;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 定时任务装配：开启 Spring @Scheduled 调度（此前工程无任何调度能力）。
 * 扫描循环见 {@link WorkflowSchedulerService}——单线程 fixedDelay，天然不重叠。
 */
@Configuration
@EnableScheduling
public class SchedulerConfig {
}
