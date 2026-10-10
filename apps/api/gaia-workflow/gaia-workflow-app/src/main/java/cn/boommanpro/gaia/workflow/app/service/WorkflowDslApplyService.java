package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 工作流 DSL 落版服务。
 *
 * <p>把「一份完整 DSL → 一个生效版本」这件事收成单一领域能力，
 * 供 REST 接口 {@code /api/workflow-version/apply/{code}} 和 Agent 后端工具
 * {@code applyWorkflow} 共同使用，避免两处各写一遍。</p>
 *
 * <p>它是「AI 产出 → 工作流落地」链路上唯一应当被依赖的服务。</p>
 */
@Slf4j
@Service
public class WorkflowDslApplyService {

    private static final Pattern VERSION_PATTERN = Pattern.compile("^v(\\d+)\\.(\\d+)$");

    private final GaiaWorkflowVersionService versionService;
    private final GaiaWorkflowService workflowService;
    private final AgentModelConfigService modelConfigService;
    private final WorkflowDiffService diffService;

    public WorkflowDslApplyService(GaiaWorkflowVersionService versionService,
                                   GaiaWorkflowService workflowService,
                                   AgentModelConfigService modelConfigService,
                                   WorkflowDiffService diffService) {
        this.versionService = versionService;
        this.workflowService = workflowService;
        this.modelConfigService = modelConfigService;
        this.diffService = diffService;
    }

    /**
     * 把整份 DSL 落为一个新版本并设为生效版本。
     *
     * @param workflowCode   工作流编码
     * @param rawDsl         DSL 对象或 JSON 字符串
     * @param options        可选项：名称、描述、是否允许新建
     */
    public ApplyResult apply(String workflowCode, Object rawDsl, ApplyOptions options) {
        ApplyResult result = new ApplyResult();
        result.setWorkflowCode(workflowCode);

        ApplyOptions opts = options != null ? options : new ApplyOptions();
        String workflowData = normalizeToJson(rawDsl);
        if (workflowData == null) {
            result.setSuccess(false);
            result.setError("dsl must not be empty");
            return result;
        }

        // 落库前统一规范化：连线别名、缺失坐标、嵌套结构、start/end 完整性
        // —— 下游（画布、执行引擎）只认规范结构，这一步不能省。
        // LLM 节点缺凭证时自动填平台默认模型，避免运行时空壳节点。
        WorkflowDslCanonicalizer.Result canonical =
            WorkflowDslCanonicalizer.canonicalize(workflowData, platformLlmDefaults());
        if (canonical.getJson() == null) {
            result.setSuccess(false);
            result.setError("dsl 结构无法识别：未解析出任何合法节点");
            return result;
        }
        // 结构之外还有语义：llm 没有 prompt、http 没有 url 的「空壳节点」
        // 落库后必然执行失败，直接拒绝并把缺失清单回传给模型补全。
        if (!canonical.getFatalIssues().isEmpty()) {
            result.setSuccess(false);
            result.setError("工作流存在不可执行的缺失，请补全后重新提交：" + String.join("；", canonical.getFatalIssues())
                + "。修复方法：给对应节点的 data 填上关键字段，例如 "
                + "{\"type\":\"llm\",\"id\":\"llm_0\",\"data\":{\"prompt\":\"请总结以下文本：{{ start_0.text }}\",\"modelName\":\"qwen/qwen3-4b-2507\"}}，"
                + "http 节点填 {\"data\":{\"method\":\"GET\",\"url\":\"https://...\"}}，"
                + "code 节点填 {\"data\":{\"script\":{\"language\":\"java\",\"content\":\"return ...;\"}}}。"
                + "补全后用相同 workflowCode 重新调用 applyWorkflow。");
            result.setFatalIssues(canonical.getFatalIssues());
            result.setWarnings(canonical.getWarnings());
            return result;
        }
        workflowData = canonical.getJson();
        result.setRepairs(canonical.getRepairs());
        result.setWarnings(canonical.getWarnings());

        try {
            GaiaWorkflow workflow = workflowService.getOne(
                new QueryWrapper<GaiaWorkflow>().eq("workflow_code", workflowCode).last("LIMIT 1"));

            // CAS：带 expectedRevision 且工作流已存在时，revision 不匹配直接拒绝。
            // 防止 AI 基于陈旧读取覆盖并发修改（用户手动保存 / 另一会话落版）。
            if (workflow != null && opts.getExpectedRevision() != null) {
                long actual = workflow.getRevision() != null ? workflow.getRevision() : 0L;
                if (actual != opts.getExpectedRevision()) {
                    result.setSuccess(false);
                    result.setStaleRevision(true);
                    result.setExpectedRevision(opts.getExpectedRevision());
                    result.setActualRevision(actual);
                    result.setError("stale revision: expected " + opts.getExpectedRevision()
                        + " but current is " + actual + "，工作流已被并发修改，请重新读取后再提交");
                    return result;
                }
            }

            // 上一版数据（diff 基准）
            String previousData = null;
            if (workflow != null && workflow.getCurrentVersionId() != null) {
                GaiaWorkflowVersion prev = versionService.getById(workflow.getCurrentVersionId());
                if (prev != null) {
                    previousData = prev.getWorkflowData();
                }
            }

            if (workflow == null) {
                if (!opts.isCreateIfMissing()) {
                    result.setSuccess(false);
                    result.setError("workflow not found: " + workflowCode);
                    return result;
                }
                workflow = new GaiaWorkflow();
                workflow.setWorkflowCode(workflowCode);
                workflow.setWorkflowName(
                    opts.getWorkflowName() != null && !opts.getWorkflowName().isEmpty()
                        ? opts.getWorkflowName() : workflowCode);
                workflow.setWorkflowDesc(opts.getWorkflowDesc());
                workflow.setCreatedAt(LocalDateTime.now());
                workflow.setUpdatedAt(LocalDateTime.now());
                workflowService.save(workflow);
                result.setWorkflowCreated(true);
            } else if (opts.getWorkflowName() != null && !opts.getWorkflowName().isEmpty()) {
                // 已存在且传了名字 → 顺带改名，让 AI 的修正能体现在标题上
                workflowService.update(new UpdateWrapper<GaiaWorkflow>()
                    .eq("workflow_code", workflowCode)
                    .set("workflow_name", opts.getWorkflowName())
                    .set("updated_at", LocalDateTime.now()));
            }

            List<GaiaWorkflowVersion> versions = versionService.list(
                new QueryWrapper<GaiaWorkflowVersion>()
                    .eq("workflow_code", workflowCode)
                    .orderByDesc("created_at"));

            GaiaWorkflowVersion version = new GaiaWorkflowVersion();
            version.setWorkflowCode(workflowCode);
            version.setVersionNumber(nextVersionNumber(versions));
            version.setVersionDesc(
                opts.getVersionDesc() != null && !opts.getVersionDesc().isEmpty()
                    ? opts.getVersionDesc() : "AI generated");
            version.setWorkflowData(workflowData);
            // 版本 diff：与上一生效版本的差异（首版 diff 为空集合）
            try {
                cn.hutool.json.JSONObject diff = diffService.diff(previousData, workflowData);
                if (!diffService.isEmpty(diff)) {
                    version.setDiffJson(diff.toString());
                }
            } catch (Exception e) {
                log.debug("[dsl-apply] diff compute failed (ignored): {}", e.getMessage());
            }
            version.setCreatedBy("agent");
            version.setCreatedAt(LocalDateTime.now());
            // 先以非生效版本落行，切换由下面的原子 CAS 完成——
            // 并发竞争失败时这行会被回滚删除，不会留下指向它的悬空状态
            version.setIsCurrent(opts.getExpectedRevision() != null ? 0 : 1);
            versionService.save(version);

            // 原子切换生效版本 + revision 递增（CAS 基准）。
            // 条件 UPDATE 消除「先读再比对再写」的 TOCTOU 窗口：
            // 两个并发提交基于同一 revision 时，只有一个能把 revision 推到 next。
            boolean switched;
            if (opts.getExpectedRevision() != null && workflow != null) {
                switched = workflowService.update(new UpdateWrapper<GaiaWorkflow>()
                    .eq("workflow_code", workflowCode)
                    .eq("revision", opts.getExpectedRevision())
                    .set("current_version_id", version.getId())
                    .setSql("revision = revision + 1")
                    .set("updated_at", LocalDateTime.now()));
                if (!switched) {
                    // 竞争失败：撤掉刚插的版本行，按当前实际 revision 报 CAS 冲突
                    versionService.removeById(version.getId());
                    GaiaWorkflow current = workflowService.getOne(
                        new QueryWrapper<GaiaWorkflow>().eq("workflow_code", workflowCode).last("LIMIT 1"));
                    long actual = current != null && current.getRevision() != null ? current.getRevision() : 0L;
                    result.setSuccess(false);
                    result.setStaleRevision(true);
                    result.setExpectedRevision(opts.getExpectedRevision());
                    result.setActualRevision(actual);
                    result.setError("stale revision: expected " + opts.getExpectedRevision()
                        + " but current is " + actual + "，工作流已被并发修改，请重新读取后再提交");
                    return result;
                }
            } else {
                // 无 CAS 基准（REST 手动落版等）：revision 仍在 SQL 内原子自增
                workflowService.update(new UpdateWrapper<GaiaWorkflow>()
                    .eq("workflow_code", workflowCode)
                    .set("current_version_id", version.getId())
                    .setSql("revision = revision + 1")
                    .set("updated_at", LocalDateTime.now()));
            }
            if (version.getIsCurrent() == null || version.getIsCurrent() != 1) {
                versionService.update(new UpdateWrapper<GaiaWorkflowVersion>()
                    .eq("workflow_code", workflowCode)
                    .ne("id", version.getId())
                    .set("is_current", 0));
                versionService.update(new UpdateWrapper<GaiaWorkflowVersion>()
                    .eq("id", version.getId())
                    .set("is_current", 1));
            }

            // 提交后的 revision 以数据库为准回读（并发下自己拿到的也可能不是最终值）
            GaiaWorkflow committed = workflowService.getOne(
                new QueryWrapper<GaiaWorkflow>().eq("workflow_code", workflowCode).last("LIMIT 1"));
            long nextRevision = committed != null && committed.getRevision() != null ? committed.getRevision() : 1L;

            result.setSuccess(true);
            result.setVersionId(version.getId());
            result.setVersionNumber(version.getVersionNumber());
            result.setNodeCount(countNodes(workflowData));
            result.setRevision(nextRevision);
            return result;        } catch (Exception e) {
            log.error("[dsl-apply] failed, workflowCode={}", workflowCode, e);
            result.setSuccess(false);
            result.setError(e.getMessage());
            return result;
        }
    }

    /** 平台默认模型配置（读失败时返回 null，规范化按不填充处理） */
    private WorkflowDslCanonicalizer.LlmDefaults platformLlmDefaults() {
        try {
            AgentModelConfigService.LlmConfig llm = modelConfigService.getLlmConfig();
            if (llm == null) {
                return null;
            }
            return new WorkflowDslCanonicalizer.LlmDefaults(llm.getApiHost(), llm.getApiKey(), llm.getModel());
        } catch (Exception e) {
            log.warn("[dsl-apply] 读取平台默认模型配置失败，跳过 LLM 凭证填充: {}", e.getMessage());
            return null;
        }
    }

    /** 解析版本号：v1.0 → v1.1；没有历史版本则 v1.0 */
    String nextVersionNumber(List<GaiaWorkflowVersion> versions) {
        if (versions == null || versions.isEmpty()) {
            return "v1.0";
        }
        int maxMajor = 1;
        int maxMinor = 0;
        for (GaiaWorkflowVersion v : versions) {
            if (v.getVersionNumber() == null) {
                continue;
            }
            Matcher m = VERSION_PATTERN.matcher(v.getVersionNumber().trim());
            if (!m.matches()) {
                continue;
            }
            int major = Integer.parseInt(m.group(1));
            int minor = Integer.parseInt(m.group(2));
            if (major > maxMajor || (major == maxMajor && minor > maxMinor)) {
                maxMajor = major;
                maxMinor = minor;
            }
        }
        return "v" + maxMajor + "." + (maxMinor + 1);
    }

    private String normalizeToJson(Object rawDsl) {
        if (rawDsl == null) {
            return null;
        }
        if (rawDsl instanceof String) {
            String text = ((String) rawDsl).trim();
            return text.isEmpty() ? null : text;
        }
        return JSONUtil.toJsonStr(rawDsl);
    }

    private int countNodes(String workflowData) {
        try {
            cn.hutool.json.JSONArray nodes = JSONUtil.parseObj(workflowData).getJSONArray("nodes");
            return nodes == null ? 0 : nodes.size();
        } catch (Exception e) {
            return 0;
        }
    }

    /** 转成给模型/接口回执用的 Map */
    public static Map<String, Object> toMap(ApplyResult result) {
        Map<String, Object> map = new HashMap<>();
        map.put("success", result.isSuccess());
        map.put("workflowCode", result.getWorkflowCode());
        map.put("versionId", result.getVersionId());
        map.put("versionNumber", result.getVersionNumber());
        map.put("nodeCount", result.getNodeCount());
        map.put("workflowCreated", result.isWorkflowCreated());
        if (!result.getRepairs().isEmpty()) {
            // 让模型知道系统替它修补了什么，下一轮就能自己改对
            map.put("repairs", result.getRepairs());
        }
        if (result.getError() != null) {
            map.put("error", result.getError());
        }
        return map;
    }

    /** 落版选项 */
    @Data
    public static class ApplyOptions {
        private String workflowName;
        private String workflowDesc;
        private String versionDesc;
        private boolean createIfMissing = true;
        /** CAS 基准：工作流已存在时须与当前 revision 一致才允许提交（null=跳过检查，REST 兼容） */
        private Long expectedRevision;
    }

    /** 落版结果 */
    @Data
    public static class ApplyResult {
        private boolean success;
        private String workflowCode;
        private Long versionId;
        private String versionNumber;
        private int nodeCount;
        private boolean workflowCreated;
        /** 提交后的 revision（下一次 CAS 的基准） */
        private Long revision;
        /** 规范化过程中做的修补说明（回传给模型，便于它下一轮自己写规范） */
        private List<String> repairs = new java.util.ArrayList<>();
        /** 可疑但放行的告警（start 无输出、end 无映射等），随回执提示模型 */
        private List<String> warnings = new java.util.ArrayList<>();
        /** 致命语义缺失（拒绝落版时给模型的补全清单） */
        private List<String> fatalIssues = new java.util.ArrayList<>();
        private String error;
        /** CAS 冲突标记（expectedRevision 与实际不一致） */
        private boolean staleRevision;
        private Long expectedRevision;
        private Long actualRevision;
    }
}
