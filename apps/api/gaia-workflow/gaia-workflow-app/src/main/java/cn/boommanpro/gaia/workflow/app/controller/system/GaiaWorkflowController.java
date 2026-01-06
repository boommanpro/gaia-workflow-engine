package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowTemplate;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowTemplateService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/workflow")
public class GaiaWorkflowController {

    private final GaiaWorkflowService workflowService;

    private final GaiaWorkflowTemplateService templateService;

    private final GaiaWorkflowVersionService versionService;

    public GaiaWorkflowController(GaiaWorkflowService workflowService,
                                  @Qualifier("gaiaWorkflowTemplateAppService") GaiaWorkflowTemplateService templateService,
                                  GaiaWorkflowVersionService versionService) {
        this.workflowService = workflowService;
        this.templateService = templateService;
        this.versionService = versionService;
    }

    /**
     * 获取所有工作流列表
     */
    @GetMapping("/list")
    public List<GaiaWorkflow> listWorkflows() {
        return workflowService.list();
    }

    /**
     * 根据ID获取工作流详情
     */
    @GetMapping("/{id}")
    public GaiaWorkflow getWorkflowById(@PathVariable Long id) {
        return workflowService.getById(id);
    }

    /**
     * 根据工作流编码获取工作流详情
     */
    @GetMapping("/code/{workflowCode}")
    public GaiaWorkflow getWorkflowByCode(@PathVariable String workflowCode) {
        return workflowService.getOne(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<GaiaWorkflow>()
                .eq("workflow_code", workflowCode)
                .eq("is_deleted", 0)
        );
    }

    /**
     * 创建新工作流
     * 在创建工作流时，根据模板创建初始版本并设置为启用状态
     */
    @PostMapping("/create")
    public boolean createWorkflow(@RequestBody GaiaWorkflow workflow) {
        // 保存工作流
        workflow.setCreatedAt(LocalDateTime.now());
        workflow.setUpdatedAt(LocalDateTime.now());
        boolean workflowSaved = workflowService.save(workflow);

        if (workflowSaved && workflow.getTemplateCode() != null) {
            // 根据模板编码查找模板
            GaiaWorkflowTemplate template = templateService.getOne(
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<GaiaWorkflowTemplate>()
                    .eq("template_code", workflow.getTemplateCode())
                    .eq("is_deleted", 0)
            );

            if (template != null) {
                // 创建初始版本
                GaiaWorkflowVersion version = new GaiaWorkflowVersion();
                version.setWorkflowCode(workflow.getWorkflowCode());
                version.setVersionNumber("v1.0");
                version.setVersionDesc("基于模板 [" + template.getTemplateName() + "] 创建的初始版本");
                version.setWorkflowData(template.getTemplateData());
                version.setCreatedBy("system");
                version.setIsCurrent(1); // 设置为当前版本
                version.setCreatedAt(LocalDateTime.now());

                // 保存版本
                boolean versionSaved = versionService.save(version);

                if (versionSaved) {
                    // 更新工作流的当前版本ID
                    workflow.setCurrentVersionId(version.getId());
                    workflowService.updateById(workflow);
                }
            }
        }

        return workflowSaved;
    }

    /**
     * 更新工作流
     */
    @PutMapping("/update")
    public boolean updateWorkflow(@RequestBody GaiaWorkflow workflow) {
        workflow.setUpdatedAt(LocalDateTime.now());
        return workflowService.updateById(workflow);
    }

    /**
     * 删除工作流
     */
    @DeleteMapping("/delete/{id}")
    public boolean deleteWorkflow(@PathVariable Long id) {
        return workflowService.removeById(id);
    }
}
