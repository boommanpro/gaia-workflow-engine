package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * edit_workflow —— 增量修改的主力工具（dsh edit 的对应物）。
 *
 * <p>ops 数组一次性原子应用：任一 op 校验失败整批拒绝（草稿不变），错误按
 * {@code ops[i].field} 定位。同批新节点可用 {@code $ref} 互相引用（服务端解析，
 * 取代旧 createPlan/executeStep 的跨轮次 $0/$1 占位符）。</p>
 *
 * <p>操作对象是会话草稿：传 workflowCode 时若草稿未绑定/绑定了别的工作流，
 * 自动从该工作流当前版本水化（并记录 CAS 基准 baseRevision）。改完用
 * save_workflow 落版。</p>
 */
@Slf4j
@Component
public class EditWorkflowToolExecutor implements ToolExecutor {

    private final SessionWorkflowDraftService draftService;
    private final GaiaWorkflowService workflowService;
    private final GaiaWorkflowVersionService versionService;

    public EditWorkflowToolExecutor(SessionWorkflowDraftService draftService,
                                    GaiaWorkflowService workflowService,
                                    GaiaWorkflowVersionService versionService) {
        this.draftService = draftService;
        this.workflowService = workflowService;
        this.versionService = versionService;
    }

    @Override
    public String name() {
        return "edit_workflow";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "增量修改工作流（会话草稿）：ops 批处理，原子生效";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String sessionKey = context.getSessionKey();
        try {
            // 绑定：显式 workflowCode 且草稿没绑它 → 水化
            String workflowCode = args.getStr("workflowCode");
            if (workflowCode != null && !workflowCode.trim().isEmpty()) {
                String hydrateError = hydrateIfNeeded(sessionKey, workflowCode.trim());
                if (hydrateError != null) {
                    return ToolResult.notFound(hydrateError);
                }
            }

            // 两种形状等价：ops 数组 或 声明式 delta（addNodes/updateNodes/...），合并后原子应用
            JSONArray ops = args.getJSONArray("ops");
            if (ops == null) {
                ops = SessionWorkflowDraftService.opsFromDeclarative(args);
            } else {
                JSONArray declarative = SessionWorkflowDraftService.opsFromDeclarative(args);
                for (int i = 0; i < declarative.size(); i++) {
                    ops.add(declarative.get(i));
                }
            }
            SessionWorkflowDraftService.OpsOutcome outcome = draftService.applyOps(sessionKey, ops);
            if (!outcome.ok) {
                return ToolResult.invalidArgs(outcome.violations,
                    "ops 批处理校验未通过，整批未生效。按 violations 修正后整批重发");
            }

            // 广播文档（订阅窗口实时渲染）
            draftService.emitDocument(context, sessionKey);
            JSONObject summary = outcome.summary;
            JSONObject payload = new JSONObject()
                .set("success", true)
                .set("applied", summary.getInt("applied"))
                .set("nodes", summary.getJSONObject("nodes"))
                .set("edges", summary.getJSONObject("edges"))
                .set("draftRevision", summary.getInt("draftRevision"))
                .set("boundCode", summary.getStr("boundCode"))
                .set("baseRevision", summary.getLong("baseRevision"))
                .set("hint", "草稿已更新。需要生效到线上版本时调用 save_workflow"
                    + (summary.getStr("boundCode") != null
                        ? "（baseRevision 用 " + summary.getLong("baseRevision") + "）" : ""));
            return ToolResult.ok(payload.toString(), "已应用 " + summary.getInt("applied") + " 个操作");
        } catch (Exception e) {
            log.warn("[tool:edit_workflow] failed: {}", e.getMessage());
            return ToolResult.fail(new JSONObject().set("error", e.getMessage()).toString(),
                "增量修改失败", cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode.EXEC_ERROR);
        }
    }

    /** 草稿与目标工作流未绑定时从当前版本水化；返回错误文案（null=成功） */
    private String hydrateIfNeeded(String sessionKey, String workflowCode) {
        if (workflowCode.equals(draftService.getBoundCode(sessionKey))) {
            return null;
        }
        GaiaWorkflow workflow = workflowService.getOne(
            new QueryWrapper<GaiaWorkflow>().eq("workflow_code", workflowCode).last("LIMIT 1"));
        if (workflow == null) {
            return "工作流 " + workflowCode;
        }
        GaiaWorkflowVersion current = null;
        if (workflow.getCurrentVersionId() != null) {
            current = versionService.getById(workflow.getCurrentVersionId());
        }
        if (current == null || current.getWorkflowData() == null) {
            return null; // 空壳工作流：不水化，草稿从零开始
        }
        long revision = workflow.getRevision() != null ? workflow.getRevision() : 0L;
        draftService.bindFromVersion(sessionKey, workflowCode, revision,
            cn.hutool.json.JSONUtil.parseObj(current.getWorkflowData()));
        return null;
    }
}
