package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionPlanStore;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * createPlan 工具的后端执行器 —— todo 计划机制的后端化。
 *
 * <p>把「生成计划」从前端 React 状态搬进 {@link SessionPlanStore}：
 * 计划按会话存储，多窗口可见，刷新/关窗不丢。生成后广播 {@code plan} 事件
 * 让所有窗口渲染 PlanCard，返回下一步引导模型去调 executeStep。</p>
 */
@Slf4j
@Component
public class CreatePlanToolExecutor implements ToolExecutor {

    private final SessionPlanStore planStore;

    public CreatePlanToolExecutor(SessionPlanStore planStore) {
        this.planStore = planStore;
    }

    @Override
    public String name() {
        return "createPlan";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.ANY;
    }

    @Override
    public String description() {
        return "创建多步骤执行计划（todo 机制），配合 executeStep 逐步执行";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        JSONArray rawSteps = args.getJSONArray("steps");
        if (rawSteps == null || rawSteps.isEmpty()) {
            return ToolResult.fail("{\"error\":\"steps is empty\"}", "steps 不能为空");
        }

        JSONArray steps = new JSONArray();
        for (int i = 0; i < rawSteps.size(); i++) {
            JSONObject raw = rawSteps.getJSONObject(i);
            JSONObject step = new JSONObject()
                .set("intent", raw.getStr("intent") != null ? raw.getStr("intent")
                    : (raw.getStr("description") != null ? raw.getStr("description") : "Step " + (i + 1)))
                .set("action", raw.getStr("action") != null ? raw.getStr("action") : "unknown")
                .set("args", raw.getJSONObject("args") != null ? raw.getJSONObject("args") : new JSONObject())
                .set("status", "pending");
            steps.add(step);
        }

        String planId = "plan_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        JSONObject plan = new JSONObject()
            .set("id", planId)
            .set("steps", steps)
            .set("createdNodeIds", new JSONArray());
        planStore.save(context.getSessionKey(), plan);

        // 广播计划，让所有订阅窗口渲染 PlanCard
        context.emit("plan", plan);

        return ToolResult.ok(new JSONObject()
            .set("success", true)
            .set("planId", planId)
            .set("stepsCount", steps.size())
            .set("nextStepIndex", 0)
            .set("message",
                "Plan created with " + steps.size() + " steps. Call executeStep(stepIndex=0) to execute the first step. "
                    + "After each step, check the result and continue with executeStep(stepIndex=N+1) or adjust and retry.")
            .toString(), "已创建 " + steps.size() + " 步执行计划");
    }
}
