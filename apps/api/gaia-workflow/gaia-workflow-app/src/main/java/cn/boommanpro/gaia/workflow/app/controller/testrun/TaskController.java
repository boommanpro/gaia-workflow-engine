package cn.boommanpro.gaia.workflow.app.controller.testrun;

import cn.boommanpro.gaia.workflow.app.domain.testrun.input.TaskCancelInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.input.TaskRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskCancelOutput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskReportOutput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskResultOutput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskRunOutput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskValidateOutput;
import cn.boommanpro.gaia.workflow.app.service.WorkflowTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 工作流任务API控制器
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 13:28
 */
@RestController
@RequestMapping("api/task")
@CrossOrigin(origins = "*", allowCredentials = "false", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class TaskController {

    private final WorkflowTaskService workflowTaskService;

    @Autowired
    public TaskController(WorkflowTaskService workflowTaskService) {
        this.workflowTaskService = workflowTaskService;
    }

    /**
     * 验证工作流
     */
    @PostMapping("validate")
    public TaskValidateOutput validate(@RequestBody TaskRunInput input) {
        return workflowTaskService.validateWorkflow(input);
    }

    /**
     * 运行工作流
     */
    @PostMapping("run")
    public TaskRunOutput run(@RequestBody TaskRunInput input) {
        return workflowTaskService.runWorkflow(input);
    }

    /**
     * 获取任务报告
     */
    @GetMapping("report")
    public TaskReportOutput report(@RequestParam String taskID) {
        return workflowTaskService.getTaskReport(taskID);
    }

    /**
     * 取消任务
     */
    @PutMapping("cancel")
    public TaskCancelOutput cancel(@RequestBody TaskCancelInput input) {
        return workflowTaskService.cancelTask(input);
    }

    /**
     * 获取任务结果
     */
    @GetMapping("result")
    public TaskResultOutput result(@RequestParam String taskID) {
        return workflowTaskService.getTaskResult(taskID);
    }
}
