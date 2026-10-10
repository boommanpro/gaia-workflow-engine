package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowTemplate;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowTemplateAppService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * list_templates —— 模板目录（原 query.templates）。
 */
@Component
public class ListTemplatesToolExecutor implements ToolExecutor {

    private final GaiaWorkflowTemplateAppService templateService;

    public ListTemplatesToolExecutor(GaiaWorkflowTemplateAppService templateService) {
        this.templateService = templateService;
    }

    @Override
    public String name() {
        return "list_templates";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "列出工作流模板目录";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        QueryWrapper<GaiaWorkflowTemplate> wrapper = new QueryWrapper<GaiaWorkflowTemplate>()
            .orderByDesc("created_at").last("LIMIT 50");
        String keyword = args.getStr("keyword");
        if (keyword != null && !keyword.trim().isEmpty()) {
            wrapper.and(w -> w.like("template_name", keyword.trim())
                .or().like("template_code", keyword.trim()));
        }
        List<GaiaWorkflowTemplate> list = templateService.list(wrapper);
        JSONArray array = new JSONArray();
        for (GaiaWorkflowTemplate tpl : list) {
            array.add(new JSONObject()
                .set("templateCode", tpl.getTemplateCode())
                .set("templateName", tpl.getTemplateName())
                .set("templateDesc", tpl.getTemplateDesc()));
        }
        return ToolResult.ok(array.toString(), "查询到 " + array.size() + " 个模板");
    }
}
