package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowLog;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowLogService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workflow-log")
public class GaiaWorkflowLogController {

    private final GaiaWorkflowLogService workflowLogService;

    public GaiaWorkflowLogController(GaiaWorkflowLogService workflowLogService) {
        this.workflowLogService = workflowLogService;
    }

    /**
     * 获取指定工作流的所有日志列表
     */
    @GetMapping("/list/{workflowCode}")
    public List<GaiaWorkflowLog> listLogsByWorkflowCode(@PathVariable String workflowCode) {
        return workflowLogService.list(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<GaiaWorkflowLog>()
                .eq("workflow_code", workflowCode)
                .orderByDesc("created_at")
        );
    }

    /**
     * 获取指定工作流和版本的日志列表
     */
    @GetMapping("/list/{workflowCode}/{versionNumber}")
    public List<GaiaWorkflowLog> listLogsByVersion(@PathVariable String workflowCode,
                                                      @PathVariable String versionNumber) {
        return workflowLogService.list(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<GaiaWorkflowLog>()
                .eq("workflow_code", workflowCode)
                .eq("version_number", versionNumber)
                .orderByDesc("created_at")
        );
    }

    /**
     * 根据ID获取日志详情
     */
    @GetMapping("/{id}")
    public GaiaWorkflowLog getLogById(@PathVariable Long id) {
        return workflowLogService.getById(id);
    }

    /**
     * 根据执行ID获取日志详情
     */
    @GetMapping("/execution/{executionId}")
    public GaiaWorkflowLog getLogByExecutionId(@PathVariable String executionId) {
        return workflowLogService.getOne(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<GaiaWorkflowLog>()
                .eq("execution_id", executionId)
        );
    }

    /**
     * 创建新日志
     */
    @PostMapping("/create")
    public boolean createLog(@RequestBody GaiaWorkflowLog log) {
        return workflowLogService.save(log);
    }

    /**
     * 更新日志
     */
    @PutMapping("/update")
    public boolean updateLog(@RequestBody GaiaWorkflowLog log) {
        return workflowLogService.updateById(log);
    }

    /**
     * 删除日志
     */
    @DeleteMapping("/delete/{id}")
    public boolean deleteLog(@PathVariable Long id) {
        return workflowLogService.removeById(id);
    }
}
