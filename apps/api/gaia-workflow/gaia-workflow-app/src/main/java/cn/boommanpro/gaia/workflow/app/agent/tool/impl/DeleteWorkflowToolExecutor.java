package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.stereotype.Component;

/**
 * delete_workflow —— manage 遗产的唯一幸存者。
 *
 * <p>删除不可逆：必须先向用户复述删除目标并征得明确同意，然后携带 confirmed=true。
 * 未确认时返回 confirmation_required，模型应转述给用户而不是重试。</p>
 */
@Component
public class DeleteWorkflowToolExecutor implements ToolExecutor {

    private final GaiaWorkflowService workflowService;

    public DeleteWorkflowToolExecutor(GaiaWorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    @Override
    public String name() {
        return "delete_workflow";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "删除工作流（不可逆，需用户确认后带 confirmed=true）";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String code = args.getStr("workflowCode");
        Long id = args.getLong("id");
        if (id == null && (code == null || code.isEmpty())) {
            return ToolResult.fail(new JSONObject().set("error", "workflowCode is required").toString(),
                "缺少删除目标", ToolErrorCode.INVALID_ARGS);
        }
        if (!Boolean.TRUE.equals(args.getBool("confirmed"))) {
            return ToolResult.rejected(new JSONObject()
                .set("error", "confirmation_required")
                .set("message", "删除工作流不可恢复。请先向用户复述要删除的工作流并征求明确同意，"
                    + "用户同意后再次调用本工具并传入 confirmed=true。")
                .toString(), "删除工作流需要用户明确确认");
        }
        if (id != null) {
            return workflowService.removeById(id)
                ? ToolResult.ok("{\"success\":true}", "已删除工作流 " + id)
                : ToolResult.notFound("工作流 " + id);
        }
        boolean removed = workflowService.remove(
            new QueryWrapper<GaiaWorkflow>().eq("workflow_code", code));
        return removed
            ? ToolResult.ok("{\"success\":true}", "已删除工作流 " + code)
            : ToolResult.notFound("工作流 " + code);
    }
}
