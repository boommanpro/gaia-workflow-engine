package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslApplyService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslCanonicalizer;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * applyWorkflow 工具的后端执行器 —— 自治模式的核心生产力。
 *
 * <p>它让「AI 产出工作流」这件事<strong>彻底不依赖浏览器</strong>：
 * 模型一次给出完整 DSL，服务端直接校验结构、落版本、设生效。</p>
 *
 * <p>落版是人机交接点：本工具的策略由 {@code agent.policy.apply_confirm_mode} 控制
 * （默认 require，见 {@code ToolPolicyService}），用户在会话流的「应用卡片」上
 * 确认后才会真正执行到这里；确认前画布与版本保持原样。</p>
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
    private final GaiaWorkflowService workflowService;
    private final AgentModelConfigService modelConfigService;

    public ApplyWorkflowToolExecutor(WorkflowDslApplyService dslApplyService,
                                     SessionWorkflowDraftService draftService,
                                     GaiaWorkflowService workflowService,
                                     AgentModelConfigService modelConfigService) {
        this.dslApplyService = dslApplyService;
        this.draftService = draftService;
        this.workflowService = workflowService;
        this.modelConfigService = modelConfigService;
    }

    /** 查找同名且没有任何版本的未落版工作流编码（供复用，避免同名空壳残留） */
    private String findEmptyWorkflowToReuse(String workflowName) {
        if (workflowName == null || workflowName.trim().isEmpty()) {
            return null;
        }
        try {
            GaiaWorkflow shell = workflowService.getOne(
                new QueryWrapper<GaiaWorkflow>()
                    .eq("workflow_name", workflowName.trim())
                    .isNull("current_version_id")
                    .eq("is_deleted", 0)
                    .last("LIMIT 1"));
            return shell != null ? shell.getWorkflowCode() : null;
        } catch (Exception e) {
            return null;
        }
    }

    /** 解析工作流编码：留空时复用同名空壳或生成新编码 */
    private String resolveWorkflowCode(JSONObject args) {
        String workflowCode = args.getStr("workflowCode");
        if (workflowCode == null || workflowCode.isEmpty()) {
            // 同名且从未落过版的「空壳」直接复用：模型常先 manage.createWorkflow 建壳
            // 再 applyWorkflow 落 DSL，若不认领同一个 code，库里会留下同名空工作流。
            String reused = findEmptyWorkflowToReuse(args.getStr("workflowName"));
            workflowCode = reused != null ? reused
                : "wf_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        }
        return workflowCode;
    }

    /** 把工具入参组装成 {nodes, edges, globalVariable?} DSL 对象 */
    private JSONObject buildDsl(JSONObject args) {
        JSONObject dsl = new JSONObject();
        dsl.set("nodes", args.get("nodes"));
        if (args.get("edges") != null) {
            dsl.set("edges", args.get("edges"));
        } else {
            dsl.set("edges", new cn.hutool.json.JSONArray());
        }
        if (args.get("globalVariable") != null) {
            dsl.set("globalVariable", args.get("globalVariable"));
        }
        return dsl;
    }

    /** 与 WorkflowDslApplyService 保持一致的语义缺失错误文案（含修复示例） */
    private String buildFatalError(java.util.List<String> fatalIssues) {
        return "工作流存在不可执行的缺失，请补全后重新提交：" + String.join("；", fatalIssues)
            + "。修复方法：给对应节点的 data 填上关键字段，例如 "
            + "{\"type\":\"llm\",\"id\":\"llm_0\",\"data\":{\"prompt\":\"请总结以下文本：{{ start_0.text }}\"}}，"
            + "http 节点填 {\"data\":{\"method\":\"GET\",\"url\":\"https://...\"}}，"
            + "code 节点填 {\"data\":{\"script\":{\"language\":\"java\",\"content\":\"return ...;\"}}}。"
            + "llm 节点无需填写 apiKey/apiHost/modelName，系统会自动使用平台默认模型。"
            + "补全后用相同 workflowCode 重新调用 applyWorkflow。";
    }

    /** 平台默认模型配置（读取失败时返回 null，规范化按不填充处理） */
    private WorkflowDslCanonicalizer.LlmDefaults platformLlmDefaults() {
        try {
            AgentModelConfigService.LlmConfig llm = modelConfigService.getLlmConfig();
            if (llm == null) {
                return null;
            }
            return new WorkflowDslCanonicalizer.LlmDefaults(llm.getApiHost(), llm.getApiKey(), llm.getModel());
        } catch (Exception e) {
            log.warn("[tool:applyWorkflow] 读取平台默认模型配置失败: {}", e.getMessage());
            return null;
        }
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
    public ToolResult preValidate(JSONObject args) {
        if (args.get("nodes") == null) {
            return ToolResult.fail("{\"error\":\"nodes is required\"}", "缺少 nodes 参数");
        }
        JSONObject dsl = buildDsl(args);
        try {
            WorkflowDslCanonicalizer.Result canonical =
                WorkflowDslCanonicalizer.canonicalize(dsl.toString(), platformLlmDefaults());
            if (canonical.getJson() == null) {
                return ToolResult.fail(
                    new JSONObject().set("error", "dsl 结构无法识别：未解析出任何合法节点").toString(),
                    "DSL 结构无法识别");
            }
            if (!canonical.getFatalIssues().isEmpty()) {
                // 确认卡片弹出前先拦截：语义缺失不该消耗一次用户确认
                return ToolResult.fail(
                    new JSONObject().set("error", buildFatalError(canonical.getFatalIssues())).toString(),
                    "落版校验未通过：" + String.join("；", canonical.getFatalIssues()));
            }
            // 结构完整性：多节点却没有任何连线是灾难性缺陷（实测弱模型重构 DSL 时高发），
            // 一旦落版所有节点都是孤立的，线上版本完全不可运行——必须在弹卡前拒绝
            cn.hutool.json.JSONArray edges = canonical.getJson() != null
                ? cn.hutool.json.JSONUtil.parseObj(canonical.getJson()).getJSONArray("edges") : null;
            cn.hutool.json.JSONArray nodesArr = canonical.getJson() != null
                ? cn.hutool.json.JSONUtil.parseObj(canonical.getJson()).getJSONArray("nodes") : null;
            if (nodesArr != null && nodesArr.size() >= 2 && (edges == null || edges.isEmpty())) {
                return ToolResult.fail(
                    new JSONObject().set("error", "edges is empty: " + nodesArr.size()
                        + " nodes but 0 edges. 提交的 DSL 缺少节点连线，落版后所有节点都是孤立的。"
                        + "请先补全 edges（start → ... → end 完整链路）后重新提交，"
                        + "或用 query(resource=workflowDetail) / 会话画布获取真实连线关系，不要凭记忆重构。").toString(),
                    "落版校验未通过：" + nodesArr.size() + " 个节点但没有任何连线（edges）");
            }
            return null;
        } catch (Exception e) {
            log.warn("[tool:applyWorkflow] preValidate failed: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        Object nodes = args.get("nodes");
        if (nodes == null) {
            return ToolResult.fail("{\"error\":\"nodes is required\"}", "缺少 nodes 参数");
        }

        // 未指定编码时新建；保持与前端 createWorkflow 一致的命名习惯
        String workflowCode = resolveWorkflowCode(args);
        JSONObject dsl = buildDsl(args);

        WorkflowDslApplyService.ApplyOptions options = new WorkflowDslApplyService.ApplyOptions();
        options.setWorkflowName(args.getStr("workflowName"));
        options.setWorkflowDesc(args.getStr("workflowDesc"));
        options.setVersionDesc(args.getStr("versionDesc"));
        options.setCreateIfMissing(true);

        WorkflowDslApplyService.ApplyResult result = dslApplyService.apply(workflowCode, dsl, options);
        if (!result.isSuccess()) {
            // 语义门禁拒绝（如 llm 缺 prompt）：把缺失清单原样回传，模型下一轮补全后重试
            return ToolResult.fail(
                new JSONObject().set("error", result.getError()).toString(),
                "落版失败：" + result.getError());
        }

        // 同步更新服务端会话草稿并广播 document 事件，让所有订阅窗口立即看到产物。
        // replace 内部会把 workflow 产物落为 applied（这是用户确认后的落版收口）。
        try {
            WorkflowDslCanonicalizer.Result canonicalized =
                WorkflowDslCanonicalizer.canonicalize(dsl.toString(), platformLlmDefaults());
            if (canonicalized != null && canonicalized.getJson() != null) {
                draftService.replace(context.getSessionKey(),
                    cn.hutool.json.JSONUtil.parseObj(canonicalized.getJson()),
                    "applied", "已落版 " + result.getVersionNumber() + " · " + result.getNodeCount() + " 节点");
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
        if (!result.getWarnings().isEmpty()) {
            payload.set("warnings", result.getWarnings());
        }

        String hint = "已生成工作流 " + workflowCode + " 并落为版本 " + result.getVersionNumber();
        if (!result.getRepairs().isEmpty()) {
            hint = hint + "（系统已自动修补 " + result.getRepairs().size() + " 处不规范结构）";
        }
        if (!result.getWarnings().isEmpty()) {
            hint = hint + "。注意：" + String.join("；", result.getWarnings()) + "。如与用户需求不符请主动修正";
        }
        return ToolResult.ok(payload.toString(), hint);
    }
}
