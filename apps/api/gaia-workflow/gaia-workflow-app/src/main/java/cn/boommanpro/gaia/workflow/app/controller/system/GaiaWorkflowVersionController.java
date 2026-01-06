package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/workflow-version")
public class GaiaWorkflowVersionController {

    private final GaiaWorkflowVersionService workflowVersionService;
    @Autowired
    private GaiaWorkflowService gaiaWorkflowService;

    public GaiaWorkflowVersionController(GaiaWorkflowVersionService workflowVersionService) {
        this.workflowVersionService = workflowVersionService;
        }

    /**
     * 获取指定工作流的所有版本列表
     */
    @GetMapping("/list/{workflowCode}")
    public List<GaiaWorkflowVersion> listVersionsByWorkflowCode(@PathVariable String workflowCode) {
        return workflowVersionService.list(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<GaiaWorkflowVersion>()
                .eq("workflow_code", workflowCode)
                    .orderByDesc("created_at")
        );
    }

    /**
     * 根据ID获取版本详情
     */
    @GetMapping("/{id}")
    public GaiaWorkflowVersion getVersionById(@PathVariable Long id) {
        return workflowVersionService.getById(id);
    }

    /**
     * 创建新版本
     */
    @PostMapping("/create")
    public boolean createVersion(@RequestBody GaiaWorkflowVersion version) {
        version.setCreatedAt(LocalDateTime.now());
        version.setIsCurrent(0);
        return workflowVersionService.save(version);
    }

    /**
     * 更新版本
     */
    @PutMapping("/update")
    public boolean updateVersion(@RequestBody GaiaWorkflowVersion version) {
        return workflowVersionService.updateById(version);
    }

    /**
     * 删除版本
     */
    @DeleteMapping("/delete/{id}")
    public boolean deleteVersion(@PathVariable Long id) {
        return workflowVersionService.removeById(id);
    }

    /**
     * 设置为当前版本
     */
    @PutMapping("/set-current/{id}")
    public boolean setCurrentVersion(@PathVariable Long id) {
        // 先将该工作流下的所有版本设为非当前版本
        GaiaWorkflowVersion version = workflowVersionService.getById(id);
        gaiaWorkflowService.update(new UpdateWrapper<GaiaWorkflow>().eq("workflow_code", version.getWorkflowCode()).set("current_version_id", id));
        if (version != null) {
            workflowVersionService.update(
                new com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<GaiaWorkflowVersion>()
                    .eq("workflow_code", version.getWorkflowCode())
                    .set("is_current", 0)
            );

            // 再将指定版本设为当前版本
            return workflowVersionService.update(
                new com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<GaiaWorkflowVersion>()
                    .eq("id", id)
                    .set("is_current", 1)
            );
        }
        return false;
    }
}
