package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowLog;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowTemplate;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowLogService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowTemplateAppService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 查询类工具的后端执行器。
 *
 * <p>只读、无副作用、不依赖 UI，因此可以安全地在自治模式下由服务端直接执行。
 * 这也是「关掉前端对话，后端照样能干活」最先落地的一批能力。</p>
 */
@Slf4j
@Component
public class QueryToolExecutor implements ToolExecutor {

    private static final int MAX_ROWS = 50;

    private final GaiaWorkflowService workflowService;
    private final GaiaWorkflowTemplateAppService templateService;
    private final GaiaWorkflowLogService logService;
    private final GaiaWorkflowVersionService versionService;
    private final SessionWorkflowDraftService draftService;

    public QueryToolExecutor(GaiaWorkflowService workflowService,
                             GaiaWorkflowTemplateAppService templateService,
                             GaiaWorkflowLogService logService,
                             GaiaWorkflowVersionService versionService,
                             SessionWorkflowDraftService draftService) {
        this.workflowService = workflowService;
        this.templateService = templateService;
        this.logService = logService;
        this.versionService = versionService;
        this.draftService = draftService;
    }

    @Override
    public String name() {
        return "query";
    }

    @Override
    public String description() {
        return "查询工作流、模板、版本与执行日志";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String resource = args.getStr("resource");
        if (resource == null || resource.isEmpty()) {
            return ToolResult.fail("{\"error\":\"resource is required\"}", "缺少 resource 参数");
        }

        try {
            switch (resource) {
                case "workflows":
                    return listWorkflows();
                case "templates":
                    return listTemplates();
                case "logs":
                    return listLogs(args.getStr("workflowCode"));
                case "workflowDetail":
                    return workflowDetail(args.getStr("workflowCode"));
                case "nodeDetail":
                    return nodeDetail(context, args.getStr("nodeId"));
                case "availableVariables":
                    return ToolResult.ok(draftService.availableVariables(context.getSessionKey()).toString(),
                        "查询到可用变量");
                default:
                    return ToolResult.fail("{\"error\":\"unknown query resource: " + resource + "\"}",
                        "不支持的查询资源");
            }
        } catch (Exception e) {
            log.warn("[tool:query] failed: {}", e.getMessage());
            return ToolResult.fail("{\"error\":\"" + e.getMessage() + "\"}", "查询失败");
        }
    }

    private ToolResult listWorkflows() {
        List<GaiaWorkflow> list = workflowService.list(
            new QueryWrapper<GaiaWorkflow>().orderByDesc("updated_at").last("LIMIT " + MAX_ROWS));
        JSONArray array = new JSONArray();
        for (GaiaWorkflow wf : list) {
            array.add(new JSONObject()
                .set("id", wf.getId())
                .set("workflowCode", wf.getWorkflowCode())
                .set("workflowName", wf.getWorkflowName())
                .set("workflowDesc", wf.getWorkflowDesc())
                .set("updatedAt", String.valueOf(wf.getUpdatedAt())));
        }
        return ToolResult.ok(array.toString(), "查询到 " + array.size() + " 个工作流");
    }

    private ToolResult listTemplates() {
        List<GaiaWorkflowTemplate> list = templateService.list(
            new QueryWrapper<GaiaWorkflowTemplate>().orderByDesc("created_at").last("LIMIT " + MAX_ROWS));
        JSONArray array = new JSONArray();
        for (GaiaWorkflowTemplate tpl : list) {
            array.add(new JSONObject()
                .set("id", tpl.getId())
                .set("templateCode", tpl.getTemplateCode())
                .set("templateName", tpl.getTemplateName())
                .set("templateDesc", tpl.getTemplateDesc()));
        }
        return ToolResult.ok(array.toString(), "查询到 " + array.size() + " 个模板");
    }

    private ToolResult listLogs(String workflowCode) {
        if (workflowCode == null || workflowCode.isEmpty()) {
            return ToolResult.fail("{\"error\":\"workflowCode is required\"}", "缺少 workflowCode");
        }
        List<GaiaWorkflowLog> list = logService.list(
            new QueryWrapper<GaiaWorkflowLog>()
                .eq("workflow_code", workflowCode)
                .orderByDesc("start_time")
                .last("LIMIT 20"));
        JSONArray array = new JSONArray();
        for (GaiaWorkflowLog log : list) {
            array.add(new JSONObject()
                .set("executionId", log.getExecutionId())
                .set("versionNumber", log.getVersionNumber())
                .set("startTime", String.valueOf(log.getStartTime())));
        }
        return ToolResult.ok(array.toString(), "查询到 " + array.size() + " 条日志");
    }

    private ToolResult workflowDetail(String workflowCode) {
        if (workflowCode == null || workflowCode.isEmpty()) {
            return ToolResult.fail("{\"error\":\"workflowCode is required\"}", "缺少 workflowCode");
        }
        GaiaWorkflow workflow = workflowService.getOne(
            new QueryWrapper<GaiaWorkflow>().eq("workflow_code", workflowCode).last("LIMIT 1"));
        if (workflow == null) {
            return ToolResult.fail("{\"error\":\"workflow not found: " + workflowCode + "\"}", "工作流不存在");
        }

        GaiaWorkflowVersion current = null;
        if (workflow.getCurrentVersionId() != null) {
            current = versionService.getById(workflow.getCurrentVersionId());
        }
        if (current == null) {
            List<GaiaWorkflowVersion> versions = versionService.list(
                new QueryWrapper<GaiaWorkflowVersion>()
                    .eq("workflow_code", workflowCode)
                    .orderByDesc("created_at")
                    .last("LIMIT 1"));
            current = versions.isEmpty() ? null : versions.get(0);
        }

        Map<String, Object> detail = new HashMap<>();
        detail.put("workflowCode", workflow.getWorkflowCode());
        detail.put("workflowName", workflow.getWorkflowName());
        detail.put("workflowDesc", workflow.getWorkflowDesc());
        detail.put("versionNumber", current != null ? current.getVersionNumber() : null);
        detail.put("workflowData", current != null ? current.getWorkflowData() : null);
        return ToolResult.ok(new JSONObject(detail).toString(), "已返回工作流详情");
    }

    /** 节点详情：读取服务端画布草稿（后端自治模式下同样可用） */
    private ToolResult nodeDetail(AgentRunContext context, String nodeId) {
        if (nodeId == null || nodeId.isEmpty()) {
            return ToolResult.fail("{\"error\":\"nodeId is required\"}", "缺少 nodeId");
        }
        cn.hutool.json.JSONObject node = draftService.getNode(context.getSessionKey(), nodeId);
        if (node == null) {
            return ToolResult.fail("{\"error\":\"node not found: " + nodeId + "\"}", "节点不存在");
        }
        return ToolResult.ok(node.toString(), "已返回节点详情");
    }
}
