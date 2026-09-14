package cn.boommanpro.gaia.workflow.app.agent.context.impl;

import cn.boommanpro.gaia.workflow.app.agent.context.ContextProvider;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowTemplate;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowTemplateAppService;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 模板目录上下文提供者：告诉模型有哪些现成模板可参考。
 *
 * <p>自治模式下模型往往没有画布上下文，这份目录是它了解系统既有资产的主要途径。</p>
 */
@Slf4j
@Component
public class TemplateCatalogContextProvider implements ContextProvider {

    private final GaiaWorkflowTemplateAppService templateService;

    public TemplateCatalogContextProvider(GaiaWorkflowTemplateAppService templateService) {
        this.templateService = templateService;
    }

    @Override
    public String id() {
        return "template-catalog";
    }

    @Override
    public String name() {
        return "可用模板";
    }

    @Override
    public int order() {
        return 30;
    }

    @Override
    public String build(AgentRunContext context) {
        List<GaiaWorkflowTemplate> templates = templateService.list(
            new QueryWrapper<GaiaWorkflowTemplate>().orderByDesc("created_at").last("LIMIT 20"));
        if (templates == null || templates.isEmpty()) {
            return null;
        }

        StringBuilder builder = new StringBuilder("系统中已有以下模板可供参考：\n");
        for (GaiaWorkflowTemplate template : templates) {
            builder.append("- ").append(template.getTemplateCode())
                .append("｜").append(template.getTemplateName());
            if (template.getTemplateDesc() != null && !template.getTemplateDesc().isEmpty()) {
                builder.append("｜").append(template.getTemplateDesc());
            }
            if (template.getTemplateData() != null && !template.getTemplateData().isEmpty()) {
                builder.append("\n  节点摘要：").append(summarize(template.getTemplateData()));
            }
            builder.append("\n");
        }
        return builder.toString();
    }

    /** 只抽结构，避免把整份模板 JSON 灌进上下文 */
    private String summarize(String templateData) {
        try {
            cn.hutool.json.JSONObject json = JSONUtil.parseObj(templateData);
            cn.hutool.json.JSONArray nodes = json.getJSONArray("nodes");
            if (nodes == null || nodes.isEmpty()) {
                return "(空)";
            }
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < nodes.size() && i < 20; i++) {
                cn.hutool.json.JSONObject node = nodes.getJSONObject(i);
                if (i > 0) {
                    builder.append(" → ");
                }
                builder.append(node.getStr("type", "?"));
            }
            return builder.toString();
        } catch (Exception e) {
            return "(解析失败)";
        }
    }
}
