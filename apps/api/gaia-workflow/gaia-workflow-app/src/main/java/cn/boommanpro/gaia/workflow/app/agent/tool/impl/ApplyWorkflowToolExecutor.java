package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslApplyService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslCanonicalizer;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * applyWorkflow 工具的后端执行器 —— 自治模式的核心生产力。
 *
 * <p>它让「AI 产出工作流」这件事<strong>彻底不依赖浏览器</strong>：
 * 模型一次给出完整 DSL，服务端直接校验结构、落版本、设生效。</p>
 *
 * <p>与之相对，旧的 {@code canvas} 系列工具必须标记成
 * {@link ExecutionSurface#FRONTEND_ONLY}（在 CanvasToolExecutor 中），
 * 因为那些操作需要真实的画布实例。</p>
 */
@Slf4j
@Component
public class ApplyWorkflowToolExecutor implements ToolExecutor {

    private final WorkflowDslApplyService dslApplyService;
    private final SessionWorkflowDraftService draftService;

    public ApplyWorkflowToolExecutor(WorkflowDslApplyService dslApplyService,
                                     SessionWorkflowDraftService draftService) {
        this.dslApplyService = dslApplyService;
        this.draftService = draftService;
    }

    @Override
    public String name() {
        return "applyWorkflow";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.ANY;
    }

    @Override
    public String description() {
        return "一次性写入完整工作流 DSL 并落为生效版本";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        Object nodes = args.get("nodes");
        if (nodes == null) {
            return ToolResult.fail("{\"error\":\"nodes is required\"}", "缺少 nodes 参数");
        }

        // 未指定编码时新建；保持与前端 createWorkflow 一致的命名习惯
        String workflowCode = args.getStr("workflowCode");
        if (workflowCode == null || workflowCode.isEmpty()) {
            workflowCode = "wf_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        }

        WorkflowDslApplyService.ApplyOptions options = new WorkflowDslApplyService.ApplyOptions();
        options.setWorkflowName(args.getStr("workflowName"));
        options.setWorkflowDesc(args.getStr("workflowDesc"));
        options.setVersionDesc(args.getStr("versionDesc"));
        options.setCreateIfMissing(true);

        JSONObject dsl = new JSONObject();
        dsl.set("nodes", nodes);
        if (args.get("edges") != null) {
            dsl.set("edges", args.get("edges"));
        } else {
            dsl.set("edges", new cn.hutool.json.JSONArray());
        }
        if (args.get("globalVariable") != null) {
            dsl.set("globalVariable", args.get("globalVariable"));
        }

        WorkflowDslApplyService.ApplyResult result = dslApplyService.apply(workflowCode, dsl, options);
        if (!result.isSuccess()) {
            return ToolResult.fail(
                new JSONObject().set("error", result.getError()).toString(),
                "落版失败：" + result.getError());
        }

        // 同步更新服务端会话草稿并广播 document 事件，让所有订阅窗口立即看到产物
        try {
            WorkflowDslCanonicalizer.Result canonicalized = WorkflowDslCanonicalizer.canonicalize(dsl.toString());
            if (canonicalized != null && canonicalized.getJson() != null) {
                draftService.replace(context.getSessionKey(),
                    cn.hutool.json.JSONUtil.parseObj(canonicalized.getJson()));
            }
            draftService.emitDocument(context, context.getSessionKey());
        } catch (Exception e) {
            log.warn("[tool:applyWorkflow] draft sync failed: {}", e.getMessage());
        }

        log.info("[tool:applyWorkflow] {} → {} ({} nodes)",
            workflowCode, result.getVersionNumber(), result.getNodeCount());

        JSONObject payload = new JSONObject()
            .set("success", true)
            .set("workflowCode", workflowCode)
            .set("versionNumber", result.getVersionNumber())
            .set("versionId", result.getVersionId())
            .set("nodeCount", result.getNodeCount())
            .set("workflowCreated", result.isWorkflowCreated());
        if (!result.getRepairs().isEmpty()) {
            // 把规范化时做的修补告诉模型，便于它下一轮直接写规范结构
            payload.set("repairs", result.getRepairs());
        }

        String hint = "已生成工作流 " + workflowCode + " 并落为版本 " + result.getVersionNumber();
        if (!result.getRepairs().isEmpty()) {
            hint = hint + "（系统已自动修补 " + result.getRepairs().size() + " 处不规范结构）";
        }
        return ToolResult.ok(payload.toString(), hint);
    }
}
