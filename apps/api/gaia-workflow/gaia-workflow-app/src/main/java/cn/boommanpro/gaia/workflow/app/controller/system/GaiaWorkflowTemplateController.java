package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowTemplate;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowTemplateAppService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/template")
public class GaiaWorkflowTemplateController {

    private final GaiaWorkflowTemplateAppService templateAppService;

    public GaiaWorkflowTemplateController(GaiaWorkflowTemplateAppService templateAppService) {
        this.templateAppService = templateAppService;
    }

    /**
     * 获取所有模板列表
     */
    @GetMapping("/list")
    public List<GaiaWorkflowTemplate> listTemplates() {
        return templateAppService.list();
    }

    /**
     * 根据ID获取模板详情
     */
    @GetMapping("/{id}")
    public GaiaWorkflowTemplate getTemplateById(@PathVariable Long id) {
        return templateAppService.getById(id);
    }

    /**
     * 创建新模板
     */
    @PostMapping("/create")
    public boolean createTemplate(@RequestBody GaiaWorkflowTemplate template) {
        return templateAppService.save(template);
    }

    /**
     * 更新模板
     */
    @PutMapping("/update")
    public boolean updateTemplate(@RequestBody GaiaWorkflowTemplate template) {
        template.setCreatedAt(null);
        return templateAppService.updateById(template);
    }

    /**
     * 删除模板
     */
    @DeleteMapping("/delete/{id}")
    public boolean deleteTemplate(@PathVariable Long id) {
        return templateAppService.removeById(id);
    }
}
