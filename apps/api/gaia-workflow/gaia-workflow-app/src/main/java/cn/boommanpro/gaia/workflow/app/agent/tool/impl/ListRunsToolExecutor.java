package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowLog;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowLogService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * list_runs —— 执行日志（原 query.logs）。
 */
@Component
public class ListRunsToolExecutor implements ToolExecutor {

    private final GaiaWorkflowLogService logService;

    public ListRunsToolExecutor(GaiaWorkflowLogService logService) {
        this.logService = logService;
    }

    @Override
    public String name() {
        return "list_runs";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "查询工作流执行日志";
    }

    @Override
    public boolean concurrencySafe() {
        // 纯读工具：可与其他读并发执行（dsh isConcurrencySafe 语义）
        return true;
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        QueryWrapper<GaiaWorkflowLog> wrapper = new QueryWrapper<GaiaWorkflowLog>()
            .orderByDesc("start_time").last("LIMIT 20");
        String code = args.getStr("workflowCode");
        if (code != null && !code.trim().isEmpty()) {
            wrapper.eq("workflow_code", code.trim());
        }
        List<GaiaWorkflowLog> list = logService.list(wrapper);
        JSONArray array = new JSONArray();
        for (GaiaWorkflowLog item : list) {
            array.add(new JSONObject()
                .set("executionId", item.getExecutionId())
                .set("workflowCode", item.getWorkflowCode())
                .set("versionNumber", item.getVersionNumber())
                .set("status", item.getStatus())
                .set("startTime", String.valueOf(item.getStartTime()))
                .set("durationMs", item.getExecutionDuration())
                .set("error", item.getErrorMessage()));
        }
        return ToolResult.ok(array.toString(), "查询到 " + array.size() + " 条执行日志");
    }
}
