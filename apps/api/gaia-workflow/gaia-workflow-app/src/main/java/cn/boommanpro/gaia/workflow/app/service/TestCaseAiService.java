package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowTestCase;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowTestRun;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowTestCaseService;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowTestRunService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 测试用例 AI 辅助（2026-11-06，前端测试面板重设计配套）。
 *
 * <p>设计边界与版本说明 AI 起草（VersionDescSuggestionService）同款：AI 只起草、不落库——
 * 生成结果经用户勾选确认后走既有 /test-case/create 入库；补断言/诊断的建议也由用户点「采纳」
 * 才经 /test-case/update 写入。</p>
 *
 * <p>安全口径：交给模型的画布摘要只含节点清单（id/type/标题）、连线与 start/end 参数声明，
 * <b>刻意不包含任何节点配置值</b>——llm 凭证等敏感值零暴露面，无需脱敏链路。</p>
 */
@Slf4j
@Service
public class TestCaseAiService {

    private static final Set<String> ALLOWED_OPS = Set.of("exists", "equals", "contains");
    private static final int MAX_DRAFTS = 6;
    private static final int MAX_ASSERTS = 8;

    private final WorkflowTestCaseService caseService;
    private final WorkflowTestRunService runService;
    private final LlmCompletionService llmCompletionService;

    public TestCaseAiService(WorkflowTestCaseService caseService,
                             WorkflowTestRunService runService,
                             LlmCompletionService llmCompletionService) {
        this.caseService = caseService;
        this.runService = runService;
        this.llmCompletionService = llmCompletionService;
    }

    /**
     * AI 生成用例草稿（不入库）。
     *
     * @param prompt 用户想覆盖的场景描述，可空——空时模型自行依据画布设计典型边界用例
     *               （2026-11-06 用户要求：随机生成效果不好，必须支持文本输入定向生成）
     */
    public List<JSONObject> generate(String workflowCode, String prompt, String schema) {
        if (schema == null || schema.isBlank()) {
            throw new IllegalArgumentException("缺少画布 schema，无法生成用例建议");
        }
        String system = "你是工作流测试工程师。根据画布结构与用户想覆盖的场景，起草测试用例草稿。\n"
            + "只输出 JSON 数组（可包裹在 ```json 围栏中），每项形如：\n"
            + "{\"name\":\"一句话场景\",\"nodeId\":\"目标节点id或null\",\"description\":\"可选说明\","
            + "\"inputs\":{},\"expected\":[{\"field\":\"output\",\"op\":\"equals\",\"value\":\"...\"}]}\n"
            + "规则：op 只能是 exists/equals/contains；nodeId 为 null 表示工作流级（inputs=start 入参对象，"
            + "断言字段只能是 end 节点输出字段）；nodeId 非空表示节点级（inputs 形如 {\"上游节点id\":{\"字段\":值}}，"
            + "断言字段是该节点输出字段）；条数 3-5；不要输出数组以外的任何文字。";
        String user = "用户场景："
            + (prompt == null || prompt.isBlank() ? "（未指定，请自行设计覆盖典型边界：空输入、边界值、异常分支）" : prompt)
            + "\n\n画布结构（不含节点配置值）：\n" + summarizeCanvas(schema);
        String content;
        try {
            content = llmCompletionService.complete(system, user, 0.3, 2000);
        } catch (Exception e) {
            throw new IllegalArgumentException("LLM 调用失败：" + e.getMessage());
        }
        return parseDrafts(content);
    }

    /** AI 补断言：优先依据最近一次实际输出；未运行过则依据 end 输出字段声明 */
    public Map<String, Object> suggestAssertions(Long caseId, String schema) {
        WorkflowTestCase testCase = requireCase(caseId);
        WorkflowTestRun run = latestRun(caseId);
        JSONObject actual = run == null ? null : parseObjQuietly(run.getActualJson());
        if (actual == null && (schema == null || schema.isBlank())) {
            throw new IllegalArgumentException("该用例尚无运行结果，且未提供画布 schema");
        }
        String system = "你是工作流测试工程师。为既有测试用例补充断言，只输出 JSON 数组，"
            + "元素形如 {\"field\",\"op\",\"value?\"}（op ∈ exists/equals/contains，equals/contains 必带 value），"
            + "最多 6 条，优先覆盖关键业务字段，不要与已有断言重复。不要输出数组以外的任何文字。";
        String user = "用例：" + testCase.getName()
            + "\n已有断言：" + testCase.getExpectedJson()
            + (actual != null
                ? "\n最近一次实际输出：" + actual
                : "\n该用例未运行过；工作流输出字段（end 节点声明）：" + endOutputFields(schema));
        String content;
        try {
            content = llmCompletionService.complete(system, user, 0.2, 800);
        } catch (Exception e) {
            throw new IllegalArgumentException("LLM 调用失败：" + e.getMessage());
        }
        JSONArray rows = normalizeExpected(JSONUtil.parseArray(stripToArrayContent(content)));
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("AI 未返回可用断言建议");
        }
        Map<String, Object> out = new HashMap<>();
        out.put("assertions", rows);
        return out;
    }

    /** AI 诊断：失败断言 → 中文结论 + 可选的期望值修复（fix 仅当期望值写错时给出） */
    public Map<String, Object> diagnose(Long caseId) {
        WorkflowTestCase testCase = requireCase(caseId);
        WorkflowTestRun run = latestRun(caseId);
        if (run == null) {
            throw new IllegalArgumentException("该用例尚无运行记录");
        }
        if (!"failed".equals(run.getStatus()) && !"error".equals(run.getStatus())) {
            throw new IllegalArgumentException("最近一次运行未失败，无需诊断");
        }
        String system = "你是工作流测试工程师。诊断测试用例的失败断言：解释根因（断言期望写错，或工作流行为需要修复），"
            + "并给出修复建议。只输出 JSON 对象：{\"diagnosis\":\"中文结论，含两个修复方向\",\"fix\":null 或 "
            + "{\"field\":\"断言字段\",\"op\":\"equals 或 contains\",\"value\":\"修正后的期望值\"}}。"
            + "仅当结论是「期望值写错」时才给 fix；不要输出对象以外的任何文字。";
        String user = "用例：" + testCase.getName()
            + "\n断言结果：" + run.getAssertResultsJson()
            + (run.getError() == null ? "" : "\n错误：" + run.getError());
        String content;
        try {
            content = llmCompletionService.complete(system, user, 0.2, 800);
        } catch (Exception e) {
            throw new IllegalArgumentException("LLM 调用失败：" + e.getMessage());
        }
        JSONObject parsed;
        try {
            parsed = JSONUtil.parseObj(stripToObjectContent(content));
        } catch (Exception e) {
            throw new IllegalArgumentException("AI 诊断输出无法解析");
        }
        Map<String, Object> out = new HashMap<>();
        out.put("diagnosis", parsed.getStr("diagnosis", ""));
        JSONObject fixRaw = parsed.getJSONObject("fix");
        if (fixRaw != null && fixRaw.getStr("field") != null) {
            JSONArray wrapper = new JSONArray();
            wrapper.add(fixRaw);
            JSONArray one = normalizeExpected(wrapper);
            if (!one.isEmpty()) {
                out.put("fix", one.getJSONObject(0));
            }
        }
        return out;
    }

    /* ------------------------------------------------------------------ */

    private WorkflowTestCase requireCase(Long caseId) {
        if (caseId == null) {
            throw new IllegalArgumentException("caseId 必填");
        }
        WorkflowTestCase testCase = caseService.getById(caseId);
        if (testCase == null) {
            throw new IllegalArgumentException("用例不存在");
        }
        return testCase;
    }

    private WorkflowTestRun latestRun(Long caseId) {
        List<WorkflowTestRun> runs = runService.list(new QueryWrapper<WorkflowTestRun>()
            .eq("case_id", caseId)
            .orderByDesc("executed_at")
            .last("LIMIT 1"));
        return runs.isEmpty() ? null : runs.get(0);
    }

    /** 画布摘要：节点清单 + 连线 + start 入参/end 输出声明（只有字段名与类型，无配置值） */
    static String summarizeCanvas(String schema) {
        JSONObject root = JSONUtil.parseObj(schema);
        StringBuilder sb = new StringBuilder();
        sb.append("节点：\n");
        JSONObject start = null;
        JSONObject end = null;
        JSONArray nodes = root.getJSONArray("nodes");
        if (nodes == null) {
            nodes = new JSONArray();
        }
        for (Object o : nodes) {
            if (!(o instanceof JSONObject)) {
                continue;
            }
            JSONObject node = (JSONObject) o;
            String type = node.getStr("type", "");
            sb.append("- ").append(node.getStr("id")).append(" (").append(type).append(")");
            JSONObject data = node.getJSONObject("data");
            if (data != null && data.getStr("title") != null) {
                sb.append(" 「").append(data.getStr("title")).append("」");
            }
            sb.append("\n");
            if ("start".equals(type)) {
                start = node;
            } else if ("end".equals(type)) {
                end = node;
            }
        }
        JSONArray edges = root.getJSONArray("edges");
        sb.append("连线：").append(edges == null ? 0 : edges.size()).append(" 条\n");
        if (start != null) {
            sb.append("工作流入参（start，字段:类型）：").append(propertiesBrief(start, "outputs")).append("\n");
        }
        if (end != null) {
            sb.append("工作流输出（end，断言字段清单）：").append(propertiesBrief(end, "inputs")).append("\n");
        }
        return sb.toString();
    }

    /** start 入参声明在 data.outputs.properties，end 输出声明在 data.inputs.properties（与前端摘要口径一致） */
    private static String propertiesBrief(JSONObject node, String dataKey) {
        JSONObject data = node.getJSONObject("data");
        if (data == null) {
            return "（无）";
        }
        JSONObject holder = data.getJSONObject(dataKey);
        JSONObject properties = holder == null ? null : holder.getJSONObject("properties");
        if (properties == null || properties.isEmpty()) {
            return "（无）";
        }
        StringBuilder sb = new StringBuilder();
        for (String key : properties.keySet()) {
            JSONObject field = properties.getJSONObject(key);
            if (sb.length() > 0) {
                sb.append(", ");
            }
            sb.append(key);
            if (field != null && field.getStr("type") != null) {
                sb.append(":").append(field.getStr("type"));
            }
        }
        return sb.toString();
    }

    private static String endOutputFields(String schema) {
        try {
            JSONArray nodes = JSONUtil.parseObj(schema).getJSONArray("nodes");
            if (nodes != null) {
                for (Object o : nodes) {
                    if (o instanceof JSONObject && "end".equals(((JSONObject) o).getStr("type"))) {
                        return propertiesBrief((JSONObject) o, "inputs");
                    }
                }
            }
        } catch (Exception ignored) {
            // 摘要失败交给上层兜底文案
        }
        return "（未解析到 end 节点输出声明）";
    }

    /** 解析模型输出的草稿数组：围栏剥离 + 逐项校验收敛（name 必填、op 白名单、无断言跳过） */
    static List<JSONObject> parseDrafts(String content) {
        JSONArray arr;
        try {
            arr = JSONUtil.parseArray(stripToArrayContent(content));
        } catch (Exception e) {
            throw new IllegalArgumentException("AI 输出无法解析为用例数组");
        }
        List<JSONObject> out = new ArrayList<>();
        for (Object o : arr) {
            if (!(o instanceof JSONObject)) {
                continue;
            }
            JSONObject c = (JSONObject) o;
            String name = c.getStr("name");
            if (name == null || name.isBlank()) {
                continue;
            }
            JSONObject draft = new JSONObject().set("name", name.trim());
            String nodeId = c.getStr("nodeId");
            draft.set("nodeId", nodeId == null || nodeId.isBlank() || "null".equals(nodeId) ? null : nodeId.trim());
            if (c.getStr("description") != null && !c.getStr("description").isBlank()) {
                draft.set("description", c.getStr("description"));
            }
            Object inputs = c.get("inputs");
            draft.set("inputs", inputs instanceof JSONObject ? inputs : new JSONObject());
            JSONArray expected = normalizeExpected(c.getJSONArray("expected"));
            if (expected.isEmpty()) {
                continue; // 无断言的用例没有执行意义
            }
            draft.set("expected", expected);
            out.add(draft);
            if (out.size() >= MAX_DRAFTS) {
                break;
            }
        }
        if (out.isEmpty()) {
            throw new IllegalArgumentException("AI 未返回可用用例建议");
        }
        return out;
    }

    /** 断言行规范化：field 必填、op 白名单（非法丢弃）、value 仅 equals/contains 保留、条数封顶 */
    static JSONArray normalizeExpected(JSONArray raw) {
        JSONArray out = new JSONArray();
        if (raw == null) {
            return out;
        }
        for (Object o : raw) {
            if (!(o instanceof JSONObject)) {
                continue;
            }
            JSONObject row = (JSONObject) o;
            String field = row.getStr("field");
            String op = row.getStr("op");
            if (field == null || field.isBlank() || op == null) {
                continue;
            }
            op = op.trim().toLowerCase();
            if (!ALLOWED_OPS.contains(op)) {
                continue;
            }
            JSONObject clean = new JSONObject().set("field", field.trim()).set("op", op);
            if (!"exists".equals(op)) {
                Object value = row.get("value");
                if (value == null) {
                    continue; // equals/contains 必须带期望值
                }
                clean.set("value", value);
            }
            out.add(clean);
            if (out.size() >= MAX_ASSERTS) {
                break;
            }
        }
        return out;
    }

    /** 提取 ```json 围栏内或首个 [ 到最后一个 ] 之间的内容 */
    static String stripToArrayContent(String content) {
        return stripBetween(content, '[', ']');
    }

    static String stripToObjectContent(String content) {
        return stripBetween(content, '{', '}');
    }

    private static String stripBetween(String content, char open, char close) {
        if (content == null) {
            return "";
        }
        String s = content.trim();
        int fence = s.indexOf("```");
        if (fence >= 0) {
            int start = s.indexOf('\n', fence);
            int endFence = s.indexOf("```", fence + 3);
            if (start >= 0 && endFence > start) {
                s = s.substring(start + 1, endFence).trim();
            }
        }
        int first = s.indexOf(open);
        int last = s.lastIndexOf(close);
        if (first >= 0 && last > first) {
            return s.substring(first, last + 1);
        }
        return s;
    }

    private static JSONObject parseObjQuietly(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            JSONObject obj = JSONUtil.parseObj(json);
            return obj.isEmpty() ? null : obj;
        } catch (Exception e) {
            return null;
        }
    }
}
