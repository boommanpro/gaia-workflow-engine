package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * read_workflow —— 完整 DSL + revision（dsh read 的对应物）。
 *
 * <p>revision 是后续 edit→save 的 CAS 基准：模型修改已有工作流前必须先读，
 * save/ write 时带 baseRevision，不一致会被 STALE_REVISION 拒绝。
 * 读已有工作流会顺带把它水化成本会话草稿（edit_workflow 的操作对象）。</p>
 */
@Component
public class ReadWorkflowToolExecutor implements ToolExecutor {

    private final GaiaWorkflowService workflowService;
    private final GaiaWorkflowVersionService versionService;
    private final cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService draftService;

    public ReadWorkflowToolExecutor(GaiaWorkflowService workflowService,
                                    GaiaWorkflowVersionService versionService,
                                    cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService draftService) {
        this.workflowService = workflowService;
        this.versionService = versionService;
        this.draftService = draftService;
    }

    @Override
    public String name() {
        return "read_workflow";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "读取工作流完整 DSL（含 revision，修改前必读）";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String code = args.getStr("workflowCode");
        GaiaWorkflow workflow = workflowService.getOne(
            new QueryWrapper<GaiaWorkflow>().eq("workflow_code", code).last("LIMIT 1"));
        if (workflow == null) {
            return ToolResult.notFound("工作流 " + code);
        }

        GaiaWorkflowVersion current = null;
        if (workflow.getCurrentVersionId() != null) {
            current = versionService.getById(workflow.getCurrentVersionId());
        }
        if (current == null) {
            List<GaiaWorkflowVersion> versions = versionService.list(
                new QueryWrapper<GaiaWorkflowVersion>()
                    .eq("workflow_code", code).orderByDesc("created_at").last("LIMIT 1"));
            current = versions.isEmpty() ? null : versions.get(0);
        }
        long revision = workflow.getRevision() != null ? workflow.getRevision() : 0L;

        // 水化会话草稿：本会话后续 edit_workflow 的 ops 作用在这份草稿上
        boolean hydrated = false;
        if (current != null && current.getWorkflowData() != null) {
            try {
                hydrated = draftService.bindFromVersion(
                    context.getSessionKey(), code, revision,
                    cn.hutool.json.JSONUtil.parseObj(current.getWorkflowData()));
            } catch (Exception e) {
                // 水化失败不影响读取本身
            }
        }

        JSONObject payload = new JSONObject()
            .set("workflowCode", code)
            .set("workflowName", workflow.getWorkflowName())
            .set("revision", revision)
            .set("versionNumber", current != null ? current.getVersionNumber() : null)
            .set("dsl", current != null && current.getWorkflowData() != null
                ? cn.hutool.json.JSONUtil.parseObj(current.getWorkflowData()) : null);
        // 大 DSL 结构化视图（dsh 拉模式钻取）：全量 JSON 超过阈值时只给节点骨架
        // （id/type/标题 + 连线），模型用 read_node 按需取单节点详情——
        // 一方面省上下文，一方面避免弱模型被长 JSON 淹没后放弃填写 data
        String dslText = current != null && current.getWorkflowData() != null ? current.getWorkflowData() : "";
        if (dslText.length() > MAX_INLINE_DSL_CHARS && payload.get("dsl") != null) {
            payload.set("dsl", structuralView(payload.getJSONObject("dsl")));
            payload.set("dslPruned", true);
            payload.set("hint", "DSL 较大，已返回节点结构骨架；用 read_node(nodeId) 查看单个节点的完整 data，"
                + "用 edit_workflow 修改后 save_workflow 落版");
        }
        return ToolResult.ok(payload.toString(),
            "已返回 " + code + "（revision " + revision + (hydrated ? "，已同步为会话草稿" : "") + "）");
    }

    /** 全量 DSL 超过此字符数时降级为结构骨架 */
    static final int MAX_INLINE_DSL_CHARS = 6000;

    /** 节点骨架：id / type / 标题 + 连线列表（编辑所需的最小信息集） */
    static cn.hutool.json.JSONObject structuralView(cn.hutool.json.JSONObject dsl) {
        cn.hutool.json.JSONObject view = new cn.hutool.json.JSONObject();
        cn.hutool.json.JSONArray nodes = new cn.hutool.json.JSONArray();
        cn.hutool.json.JSONArray rawNodes = dsl.getJSONArray("nodes");
        if (rawNodes != null) {
            for (int i = 0; i < rawNodes.size(); i++) {
                cn.hutool.json.JSONObject node = rawNodes.getJSONObject(i);
                if (node == null) {
                    continue;
                }
                cn.hutool.json.JSONObject data = node.getJSONObject("data");
                cn.hutool.json.JSONObject skeleton = new cn.hutool.json.JSONObject()
                    .set("id", node.getStr("id"))
                    .set("type", data != null ? data.getStr("type") : null)
                    .set("title", data != null ? data.getStr("title") : null);
                nodes.add(skeleton);
            }
        }
        view.set("nodes", nodes);
        cn.hutool.json.JSONArray edges = dsl.getJSONArray("edges");
        if (edges != null) {
            view.set("edges", edges);
        }
        return view;
    }
}
