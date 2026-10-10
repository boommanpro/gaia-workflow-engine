package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionArtifactStore;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * todo_write —— 进度清单（dsh todo_write 的同名移植），替代 createPlan/executeStep。
 *
 * <p>关键设计：todo 是<strong>纯展示状态</strong>，不序列化 action/args、没有执行语义。
 * 执行照旧走主 ReAct 循环 —— 每步基于新鲜观察决策，避免「计划时定死参数 +
 * $0/$1 占位符」的脆弱性。模型完成一项就重写 todo 勾掉一项。</p>
 *
 * <p>持久化为 plan 产物 + 广播 plan 事件（事件形状与旧 createPlan 兼容，
 * 前端 PlanCard 零改动即可渲染）。</p>
 */
@Slf4j
@Component
public class TodoWriteToolExecutor implements ToolExecutor {

    private final SessionArtifactStore artifactStore;

    public TodoWriteToolExecutor(SessionArtifactStore artifactStore) {
        this.artifactStore = artifactStore;
    }

    @Override
    public String name() {
        return "todo_write";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "写入/更新任务进度清单（多步骤任务展示进度用；执行仍由主循环逐项完成）";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        JSONArray rawSteps = args.getJSONArray("steps");
        if (rawSteps == null || rawSteps.isEmpty()) {
            return ToolResult.fail(new JSONObject().set("error", "steps is empty").toString(),
                "steps 不能为空", ToolErrorCode.INVALID_ARGS);
        }

        // 映射到前端 PlanCard 的状态词表（pending/running/done/error）
        JSONArray steps = new JSONArray();
        int done = 0;
        for (int i = 0; i < rawSteps.size(); i++) {
            JSONObject raw = rawSteps.getJSONObject(i);
            if (raw == null) {
                continue;
            }
            String content = raw.getStr("content") != null ? raw.getStr("content")
                : (raw.getStr("intent") != null ? raw.getStr("intent") : "Step " + (i + 1));
            String status = mapStatus(raw.getStr("status"));
            if ("done".equals(status)) {
                done++;
            }
            steps.add(new JSONObject()
                .set("id", raw.getStr("id") != null ? raw.getStr("id") : String.valueOf(i))
                .set("intent", content)
                .set("action", "todo")
                .set("args", new JSONObject())
                .set("status", status));
        }
        if (steps.isEmpty()) {
            return ToolResult.fail(new JSONObject().set("error", "steps is empty").toString(),
                "steps 不能为空", ToolErrorCode.INVALID_ARGS);
        }

        JSONObject plan = new JSONObject()
            .set("id", "todo")
            .set("kind", "todo")
            .set("steps", steps)
            .set("createdNodeIds", new JSONArray());
        try {
            artifactStore.upsertSessionScoped(context.getSessionKey(), null,
                SessionArtifactStore.TYPE_PLAN, "stable", "任务清单",
                steps.size() + " 项 · " + done + " 完成", plan);
        } catch (Exception e) {
            log.warn("[tool:todo_write] artifact persist failed: {}", e.getMessage());
        }
        context.emit("plan", plan);

        int total = steps.size();
        String hint = done >= total
            ? "清单全部完成。向用户总结结果即可"
            : "清单已更新（" + done + "/" + total + "）。继续执行当前项，完成后再调用本工具更新状态";
        return ToolResult.ok(new JSONObject()
            .set("success", true)
            .set("total", total)
            .set("done", done)
            .set("message", hint).toString(), "清单已更新：" + done + "/" + total);
    }

    /** 模型给的宽松状态词 → PlanCard 词表 */
    private static String mapStatus(String raw) {
        if (raw == null) {
            return "pending";
        }
        switch (raw.trim().toLowerCase()) {
            case "completed":
            case "done":
            case "finished":
                return "done";
            case "in_progress":
            case "running":
            case "doing":
            case "active":
                return "running";
            case "blocked":
            case "error":
            case "failed":
                return "error";
            case "pending":
            case "todo":
            default:
                return "pending";
        }
    }
}
