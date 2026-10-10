package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * list_workflows —— 工作流目录（dsh job_list 式：清单 + 摘要，不展开 DSL）。
 */
@Component
public class ListWorkflowsToolExecutor implements ToolExecutor {

    private final GaiaWorkflowService workflowService;

    public ListWorkflowsToolExecutor(GaiaWorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    @Override
    public String name() {
        return "list_workflows";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "列出工作流目录（编码/名称/当前版本/revision）";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String keyword = args.getStr("keyword");
        QueryWrapper<GaiaWorkflow> wrapper = new QueryWrapper<GaiaWorkflow>()
            .orderByDesc("updated_at").last("LIMIT 50");
        if (keyword != null && !keyword.trim().isEmpty()) {
            wrapper.and(w -> w.like("workflow_name", keyword.trim())
                .or().like("workflow_code", keyword.trim()));
        }
        List<GaiaWorkflow> list = workflowService.list(wrapper);
        JSONArray array = new JSONArray();
        for (GaiaWorkflow wf : list) {
            array.add(new JSONObject()
                .set("workflowCode", wf.getWorkflowCode())
                .set("workflowName", wf.getWorkflowName())
                .set("revision", wf.getRevision() != null ? wf.getRevision() : 0));
        }
        return ToolResult.ok(new JSONObject()
            .set("total", array.size())
            .set("workflows", array).toString(), "查询到 " + array.size() + " 个工作流");
    }
}
