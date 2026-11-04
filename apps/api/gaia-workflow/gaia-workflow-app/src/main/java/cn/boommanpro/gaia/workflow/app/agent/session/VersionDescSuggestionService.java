package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.app.service.LlmCompletionService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDiffService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * 版本说明建议 —— 「AI 起草、用户落版」的说明生成。
 *
 * <p>会话页「保存为版本」弹窗打开时调用：把当前草稿与目标工作流当前生效版本的
 * diff 交给 LLM 概括成一句人话，预填进描述输入框，用户可改可不看。AI 只写说明，
 * 不点按钮（落版动作始终是用户显式触发，与「AI 不能自动发布」的设计边界一致）。</p>
 *
 * <p>降级链：LLM 超时/失败 → 结构 diff 的确定性摘要；diff 为空/首版/空草稿各自
 * 有无需模型的固定文案。任何情况下该接口都返回可用文本，不阻断保存。</p>
 */
@Slf4j
@Service
public class VersionDescSuggestionService {

    /** LLM 概括的等待上限：说明是锦上添花，超时直接用确定性摘要，不为它拖住弹窗 */
    private static final long LLM_TIMEOUT_SECONDS = 10;

    private final SessionWorkflowDraftService draftService;
    private final GaiaWorkflowVersionService versionService;
    private final WorkflowDiffService diffService;
    private final LlmCompletionService llmCompletionService;

    /** 单线程守护执行器：阻塞 HTTP 不占用 ForkJoinPool 公共池 */
    private final ExecutorService llmExecutor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "version-desc-llm");
        t.setDaemon(true);
        return t;
    });

    public VersionDescSuggestionService(SessionWorkflowDraftService draftService,
                                        GaiaWorkflowVersionService versionService,
                                        WorkflowDiffService diffService,
                                        LlmCompletionService llmCompletionService) {
        this.draftService = draftService;
        this.versionService = versionService;
        this.diffService = diffService;
        this.llmCompletionService = llmCompletionService;
    }

    /** 建议结果：source=ai（模型概括）或 diff（确定性摘要兜底） */
    public static class Suggestion {
        public boolean success;
        public String error;
        public String desc;
        public String source;
    }

    /**
     * 生成版本说明建议。
     *
     * @param sessionKey       会话（草稿来源）
     * @param targetWorkflowCode 落版目标编码（空 = 草稿绑定的编码；仍为空按首版处理）
     */
    public Suggestion suggest(String sessionKey, String targetWorkflowCode) {
        Suggestion result = new Suggestion();
        JSONObject doc = draftService.publicDoc(sessionKey);
        JSONArray nodes = doc != null ? doc.getJSONArray("nodes") : null;
        if (nodes == null || nodes.isEmpty()) {
            result.error = "当前会话没有工作流草稿";
            return result;
        }

        String code = targetWorkflowCode != null && !targetWorkflowCode.isEmpty()
            ? targetWorkflowCode : draftService.getBoundCode(sessionKey);
        GaiaWorkflowVersion current = null;
        if (code != null && !code.isEmpty()) {
            current = versionService.getOne(new QueryWrapper<GaiaWorkflowVersion>()
                .eq("workflow_code", code)
                .eq("is_current", 1)
                .last("LIMIT 1"));
        }

        String currentJson = doc.toString();
        String previousJson = current != null ? current.getWorkflowData() : null;
        JSONObject diff = diffService.diff(previousJson, currentJson);
        boolean firstVersion = current == null;
        boolean noChange = !firstVersion && diffService.isEmpty(diff);

        // 无实质变更不值得花一次模型调用，确定性文案直达
        if (noChange) {
            result.success = true;
            result.desc = "同步保存 · 无结构变更";
            result.source = "diff";
            return result;
        }

        String deterministic = deterministicDesc(firstVersion, diff, nodes.size());
        String ai = summarizeWithLlm(code, firstVersion, diff, previousJson, currentJson);
        result.success = true;
        if (ai != null && !ai.isBlank()) {
            result.desc = ai;
            result.source = "ai";
        } else {
            result.desc = deterministic;
            result.source = "diff";
        }
        return result;
    }

    /** 确定性兜底文案：与版本列表的 diff 摘要同源（WorkflowDiffService.summarize） */
    private String deterministicDesc(boolean firstVersion, JSONObject diff, int nodeCount) {
        if (firstVersion) {
            return "新建工作流 · " + nodeCount + " 节点";
        }
        String summary = diffService.summarize(diff);
        return summary.isEmpty() ? "更新工作流" : summary;
    }

    /**
     * LLM 一句话概括；超时（阻塞主流程上限 {@value LLM_TIMEOUT_SECONDS} 秒）或任何失败
     * 返回 null，由确定性摘要兜底。输入只带变更涉及的节点标题与计数，不发整份 DSL。
     */
    private String summarizeWithLlm(String code, boolean firstVersion, JSONObject diff,
                                    String previousJson, String currentJson) {
        try {
            String changeText = describeChanges(diff, previousJson, currentJson);
            String system = "你是工作流版本说明撰写助手。根据变更摘要输出一句不超过 20 个字的简体中文版本说明，"
                + "直接陈述这次保存做了什么（例如：新增订单查询节点并接入邮件通知）。"
                + "只输出这句话本身，不要引号、前缀或任何解释。";
            String user = "工作流：" + (code != null ? code : "新工作流") + "（" + (firstVersion ? "首版" : "更新") + "）\n"
                + "变更：" + changeText;
            CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
                try {
                    return llmCompletionService.complete(system, user, 0.3, 60);
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }, llmExecutor);
            String text = future.get(LLM_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            return text != null ? text.replaceAll("[\"“”\\n]", "").trim() : null;
        } catch (Exception e) {
            log.debug("[version-desc] llm summarize unavailable, fallback to diff summary: {}",
                e instanceof java.util.concurrent.TimeoutException ? "timeout" : e.getMessage());
            return null;
        }
    }

    /** 把 diff 的 id 列表翻成「类型「标题」」的可读清单（删除节点取上一版标题，其余取当前草稿） */
    private String describeChanges(JSONObject diff, String previousJson, String currentJson) {
        JSONObject nodes = diff.getJSONObject("nodes");
        List<String> parts = new ArrayList<>();
        appendNodeLabels(parts, "新增", nodeLabelsOf(currentJson, ids(nodes, "added")));
        appendNodeLabels(parts, "修改", nodeLabelsOf(currentJson, ids(nodes, "changed")));
        appendNodeLabels(parts, "删除", nodeLabelsOf(previousJson, ids(nodes, "removed")));
        int edgesAdded = sizeOf(diff, "edges", "added");
        int edgesRemoved = sizeOf(diff, "edges", "removed");
        if (edgesAdded > 0) {
            parts.add("新增连线 " + edgesAdded + " 条");
        }
        if (edgesRemoved > 0) {
            parts.add("删除连线 " + edgesRemoved + " 条");
        }
        return parts.isEmpty() ? "结构无变化" : String.join("；", parts);
    }

    private void appendNodeLabels(List<String> parts, String verb, List<String> labels) {
        if (labels.isEmpty()) {
            return;
        }
        // 标题超过 4 个截断：说明是一句话，不是清单
        List<String> shown = labels.size() > 4 ? labels.subList(0, 4) : labels;
        parts.add(verb + "节点 " + labels.size() + " 个（" + String.join("、", shown) + "）");
    }

    private List<String> ids(JSONObject nodes, String key) {
        List<String> result = new ArrayList<>();
        JSONArray arr = nodes != null ? nodes.getJSONArray(key) : null;
        if (arr != null) {
            for (Object id : arr) {
                result.add(String.valueOf(id));
            }
        }
        return result;
    }

    private int sizeOf(JSONObject diff, String section, String key) {
        JSONArray arr = diff.getJSONObject(section) != null
            ? diff.getJSONObject(section).getJSONArray(key) : null;
        return arr != null ? arr.size() : 0;
    }

    /** 从 DSL 提取 id → 「类型「标题」」标签（找不到的 id 静默跳过） */
    private List<String> nodeLabelsOf(String dsl, List<String> ids) {
        Map<String, JSONObject> byId = new LinkedHashMap<>();
        if (dsl != null && !dsl.trim().isEmpty()) {
            try {
                JSONArray arr = JSONUtil.parseObj(dsl).getJSONArray("nodes");
                if (arr != null) {
                    for (int i = 0; i < arr.size(); i++) {
                        JSONObject n = arr.getJSONObject(i);
                        if (n != null && n.getStr("id") != null) {
                            byId.put(n.getStr("id"), n);
                        }
                    }
                }
            } catch (Exception ignore) {
                // 不可解析按空处理，标签退化为计数（appendNodeLabels 的调用方已兼容空列表）
            }
        }
        List<String> labels = new ArrayList<>();
        for (String id : ids) {
            JSONObject node = byId.get(id);
            if (node == null) {
                continue;
            }
            String type = node.getStr("type", id);
            JSONObject data = node.getJSONObject("data");
            String title = data != null ? data.getStr("title") : null;
            labels.add(title != null && !title.isEmpty() ? title : type);
        }
        return labels;
    }
}
