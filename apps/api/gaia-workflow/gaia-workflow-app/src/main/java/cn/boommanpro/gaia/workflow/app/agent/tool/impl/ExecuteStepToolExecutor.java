package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmToolCall;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionPlanStore;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * executeStep 工具的后端执行器 —— 逐个执行计划步骤。
 *
 * <p>复刻前端 executeStep 的全部语义，但状态（steps + createdNodeIds）落在后端：</p>
 * <ul>
 *   <li>占位 nodeId 解析：$0/$1 引用 + 非标准 id 替换为最近创建的 nodeId</li>
 *   <li>ref content 数组递归解析（如 end 节点 inputsValues 引用 $0）</li>
 *   <li>canvas.addNode 返回的 nodeId 记入 createdNodeIds，供后续 connect 引用</li>
 *   <li>每一步结果带 nextStepIndex 引导模型继续或收尾</li>
 * </ul>
 */
@Slf4j
@Component
public class ExecuteStepToolExecutor implements ToolExecutor {

    private final SessionPlanStore planStore;
    private final ToolExecutorRegistry registry;
    private final cn.boommanpro.gaia.workflow.app.agent.core.ToolPolicyService policyService;

    public ExecuteStepToolExecutor(SessionPlanStore planStore,
                                   ToolExecutorRegistry registry,
                                   cn.boommanpro.gaia.workflow.app.agent.core.ToolPolicyService policyService) {
        this.planStore = planStore;
        this.registry = registry;
        this.policyService = policyService;
    }

    @Override
    public String name() {
        return "executeStep";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.ANY;
    }

    @Override
    public String description() {
        return "执行 plan 中的单个步骤（todo 机制）";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        JSONObject plan = planStore.get(context.getSessionKey());
        if (plan == null) {
            return ToolResult.fail("{\"error\":\"no active plan, call createPlan first\"}",
                "没有活跃计划，请先调用 createPlan");
        }
        JSONArray steps = plan.getJSONArray("steps");
        int stepIndex = args.getInt("stepIndex", -1);
        if (stepIndex < 0 || stepIndex >= steps.size()) {
            return ToolResult.fail("{\"error\":\"invalid stepIndex " + args.get("stepIndex") + "\"}",
                "非法的 stepIndex");
        }

        JSONObject step = steps.getJSONObject(stepIndex);
        JSONArray createdNodeIds = plan.getJSONArray("createdNodeIds");
        if (createdNodeIds == null) {
            createdNodeIds = new JSONArray();
            plan.set("createdNodeIds", createdNodeIds);
        }

        String stepAction = step.getStr("action");
        JSONObject stepArgs = step.getJSONObject("args");
        if (stepArgs == null) {
            stepArgs = new JSONObject();
        }

        // ---- 占位 nodeId 解析（镜像前端逻辑） ----
        JSONObject resolved = resolveNodeIds(stepArgs, createdNodeIds);

        // ---- 计划步骤不允许绕过工具策略门禁 ----
        // 否则模型只要把敏感动作（如 applyWorkflow）写进计划，就能借 executeStep
        // 之手绕开 confirm/forbid 策略直接落版。这里与 AgentRuntime.executeLocally
        // 保持同一套裁决语义。
        cn.boommanpro.gaia.workflow.app.agent.core.ToolPolicyService policyService = this.policyService;
        String policy = policyService.resolvePolicy(context.getSessionKey(), stepAction);
        if ("forbid".equals(policy)) {
            step.set("status", "error");
            step.set("result", "步骤动作 " + stepAction + " 被权限策略禁止");
            planStore.save(context.getSessionKey(), plan);
            context.emit("plan", plan);
            return ToolResult.fail(new JSONObject()
                .set("success", false)
                .set("stepIndex", stepIndex)
                .set("error", "forbidden: 步骤动作 " + stepAction + " 被权限策略禁止，请调整计划")
                .toString(), "步骤被权限策略禁止");
        }
        if ("confirm".equals(policy)) {
            LlmToolCall stepCall = LlmToolCall.builder()
                .id("step-" + stepIndex + "-" + stepAction)
                .name(stepAction)
                .arguments(resolved.toString())
                .build();
            boolean approved = policyService.decideConfirm(context, stepCall, context.getSink());
            if (!approved) {
                step.set("status", "error");
                step.set("result", "用户未确认步骤动作 " + stepAction);
                planStore.save(context.getSessionKey(), plan);
                context.emit("plan", plan);
                return ToolResult.fail(new JSONObject()
                    .set("success", false)
                    .set("stepIndex", stepIndex)
                    .set("error", "forbidden: 用户未确认该操作，请调整计划或先向用户说明")
                    .toString(), "用户未确认该步骤");
            }
        }

        step.set("status", "running");
        context.emit("plan", plan);

        try {
            ToolResult toolResult;
            // runNode 走画布执行器（内部复用 WorkflowTaskService.runSingleNode）
            if ("canvas".equals(stepAction)) {
                Optional<ToolExecutor> canvas = registry.get("canvas");
                toolResult = canvas.isPresent()
                    ? canvas.get().execute(resolved, context)
                    : ToolResult.fail("{\"error\":\"canvas executor unavailable\"}", "画布执行器不可用");
            } else {
                Optional<ToolExecutor> executor = registry.get(stepAction);
                toolResult = executor.isPresent()
                    ? executor.get().execute(resolved, context)
                    : ToolResult.fail("{\"error\":\"unknown tool: " + stepAction + "\"}", "未知工具");
            }

            // addNode 返回的 nodeId 记入 createdNodeIds，供后续 connect 引用
            String newNodeId = null;
            if ("canvas".equals(stepAction) && "addNode".equals(resolved.getStr("action"))) {
                try {
                    JSONObject parsed = cn.hutool.json.JSONUtil.parseObj(toolResult.getPayload());
                    newNodeId = parsed.getStr("nodeId");
                    if (newNodeId != null && !newNodeId.isEmpty()) {
                        createdNodeIds.add(newNodeId);
                    }
                } catch (Exception ignored) {
                    // 解析失败不阻塞
                }
            }

            boolean success = toolResult.isSuccess() && !toolResult.isRejected();
            step.set("status", success ? "done" : "error");
            step.set("result", abbreviate(toolResult.getPayload()));
            planStore.save(context.getSessionKey(), plan);
            context.emit("plan", plan);

            boolean isLast = stepIndex >= steps.size() - 1;
            JSONObject payload = new JSONObject()
                .set("success", success)
                .set("stepIndex", stepIndex)
                .set("nodeId", newNodeId)
                .set("result", safeParse(toolResult.getPayload()))
                .set("nextStepIndex", success ? (isLast ? null : stepIndex + 1) : null)
                .set("message", success
                    ? (isLast ? "All plan steps completed."
                        : "Step " + stepIndex + " done. Call executeStep(stepIndex=" + (stepIndex + 1) + ") to continue.")
                    : "Step " + stepIndex + " failed. Adjust and re-executeStep(stepIndex=" + stepIndex + ").");
            return ToolResult.ok(payload.toString(),
                success ? "步骤执行成功" : "步骤执行失败");
        } catch (Exception e) {
            step.set("status", "error");
            step.set("result", abbreviate(e.getMessage()));
            planStore.save(context.getSessionKey(), plan);
            context.emit("plan", plan);
            return ToolResult.fail(new JSONObject()
                .set("success", false)
                .set("stepIndex", stepIndex)
                .set("error", e.getMessage())
                .toString(), "步骤执行异常");
        }
    }

    // ---------------- 内部 ----------------

    private JSONObject resolveNodeIds(JSONObject args, JSONArray createdNodeIds) {
        JSONObject copy = new JSONObject(args.toString());
        // 顶层 nodeId / from / to / afterNodeId
        for (String key : new String[]{"nodeId", "from", "to", "afterNodeId"}) {
            if (copy.get(key) instanceof String) {
                copy.set(key, resolveNodeId(copy.getStr(key), createdNodeIds));
            }
        }
        // data 内的 ref 引用递归解析
        if (copy.get("data") instanceof JSONObject) {
            copy.set("data", resolveRefValue(copy.getJSONObject("data"), createdNodeIds));
        }
        return copy;
    }

    private Object resolveRefValue(Object value, JSONArray createdNodeIds) {
        if (value instanceof String) {
            return resolveNodeId((String) value, createdNodeIds);
        }
        if (value instanceof JSONArray) {
            JSONArray arr = (JSONArray) value;
            // ref content: [nodeId, fieldName] —— 只解析第一个元素
            if (arr.size() == 2
                && arr.get(0) instanceof String && arr.get(1) instanceof String) {
                JSONArray resolved = new JSONArray();
                resolved.set(0, resolveNodeId(arr.getStr(0), createdNodeIds));
                resolved.set(1, arr.getStr(1));
                return resolved;
            }
            JSONArray out = new JSONArray();
            for (int i = 0; i < arr.size(); i++) {
                out.add(resolveRefValue(arr.get(i), createdNodeIds));
            }
            return out;
        }
        if (value instanceof JSONObject) {
            JSONObject obj = (JSONObject) value;
            JSONObject out = new JSONObject();
            for (String key : obj.keySet()) {
                out.set(key, resolveRefValue(obj.get(key), createdNodeIds));
            }
            return out;
        }
        return value;
    }

    private String resolveNodeId(String id, JSONArray createdNodeIds) {
        if (id == null || id.isEmpty()) {
            return id;
        }
        if ("start_0".equals(id) || "end_0".equals(id) || "start".equals(id) || "end".equals(id)) {
            return id;
        }
        for (int i = 0; i < createdNodeIds.size(); i++) {
            if (id.equals(createdNodeIds.getStr(i))) {
                return id;
            }
        }
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("^\\$(\\d+)$").matcher(id);
        if (matcher.matches()) {
            int idx = Integer.parseInt(matcher.group(1));
            if (idx < createdNodeIds.size()) {
                return createdNodeIds.getStr(idx);
            }
            if (!createdNodeIds.isEmpty()) {
                return createdNodeIds.getStr(createdNodeIds.size() - 1);
            }
            return id;
        }
        // 非标准 id → 替换为最近创建的 nodeId
        if (!createdNodeIds.isEmpty()) {
            return createdNodeIds.getStr(createdNodeIds.size() - 1);
        }
        return id;
    }

    private Object safeParse(String payload) {
        if (payload == null || payload.isEmpty()) {
            return new JSONObject();
        }
        try {
            return cn.hutool.json.JSONUtil.parse(payload);
        } catch (Exception e) {
            return payload;
        }
    }

    private String abbreviate(String text) {
        if (text == null) {
            return "";
        }
        return text.length() > 300 ? text.substring(0, 300) : text;
    }
}
