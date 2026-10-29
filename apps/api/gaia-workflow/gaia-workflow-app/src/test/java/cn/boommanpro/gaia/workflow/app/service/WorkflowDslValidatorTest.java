package cn.boommanpro.gaia.workflow.app.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * WorkflowDslValidator 规则用例库（L3）：每条校验规则至少一条正例 + 一条反例。
 * 用例内嵌期望的 issue code，规则变更时这里红灯。
 */
class WorkflowDslValidatorTest {

    private static String doc(String nodesJson, String edgesJson) {
        return "{\"nodes\":[" + nodesJson + "],\"edges\":[" + edgesJson + "]}";
    }

    private static String start() {
        return "{\"id\":\"start_0\",\"type\":\"start\",\"data\":{\"outputs\":{\"type\":\"object\","
            + "\"properties\":{\"q\":{\"type\":\"string\"}}}},\"meta\":{\"position\":{\"x\":0,\"y\":0}}}";
    }

    private static String endWithRef(String nodeId, String field) {
        return "{\"id\":\"end_0\",\"type\":\"end\",\"data\":{\"inputsValues\":{\"out\":{\"type\":\"ref\","
            + "\"content\":[\"" + nodeId + "\",\"" + field + "\"]}}},\"meta\":{\"position\":{\"x\":9,\"y\":0}}}";
    }

    private static Set<String> codes(List<WorkflowDslValidator.Issue> issues) {
        return issues.stream().map(WorkflowDslValidator.Issue::getCode).collect(Collectors.toSet());
    }

    // ---------- 正例：合法工作流零 error ----------

    @Test
    @DisplayName("正例：start→http→end 合法工作流零 error")
    void validFlowHasNoErrors() {
        String dsl = doc(
            start() + ","
                + "{\"id\":\"http_0\",\"type\":\"http\",\"data\":{\"title\":\"请求\",\"api\":{\"method\":\"GET\","
                + "\"url\":\"https://real.gaia.dev/api\"}},\"meta\":{\"position\":{\"x\":1,\"y\":0}}},"
                + endWithRef("http_0", "body"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"http_0\"},"
                + "{\"sourceNodeID\":\"http_0\",\"targetNodeID\":\"end_0\"}");
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(dsl);
        assertFalse(WorkflowDslValidator.hasErrors(issues), "合法工作流不应有 error: " + issues);
    }

    @Test
    @DisplayName("正例：note/comment/group 标注类节点放行（不执行）")
    void annotationNodesAreAccepted() {
        String dsl = doc(
            start() + ","
                + "{\"id\":\"note_1\",\"type\":\"note\",\"data\":{\"title\":\"备注\",\"content\":\"说明\"},"
                + "\"meta\":{\"position\":{\"x\":1,\"y\":1}}},"
                + "{\"id\":\"group_1\",\"type\":\"group\",\"data\":{},\"meta\":{\"position\":{\"x\":2,\"y\":1}}},"
                + endWithRef("start_0", "q"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"end_0\"}");
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(dsl);
        assertFalse(WorkflowDslValidator.hasErrors(issues), "标注类节点应放行: " + issues);
    }

    // ---------- S1 结构 ----------

    @Test
    @DisplayName("S1: 非法 JSON → INVALID_JSON")
    void invalidJson() {
        Set<String> c = codes(WorkflowDslValidator.validate("{nodes:["));
        assertTrue(c.contains("INVALID_JSON"));
    }

    @Test
    @DisplayName("S1: multi-condition → UNKNOWN_TYPE error（前后端分裂防线）")
    void multiConditionIsUnknownType() {
        String dsl = doc(
            start() + ","
                + "{\"id\":\"mc_0\",\"type\":\"multi-condition\",\"data\":{\"branch\":[]},"
                + "\"meta\":{\"position\":{\"x\":1,\"y\":0}}},"
                + endWithRef("start_0", "q"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"mc_0\"},"
                + "{\"sourceNodeID\":\"mc_0\",\"targetNodeID\":\"end_0\"}");
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(dsl);
        assertTrue(codes(issues).contains("UNKNOWN_TYPE"), "multi-condition 必须被打回: " + issues);
        assertTrue(issues.get(0).getMessage().contains("branches"), "打回信息要指引替代方案");
    }

    @Test
    @DisplayName("S1: assignee（负责人节点）已删除 → UNKNOWN_TYPE（2026-10-28 删除回归守卫）")
    void assigneeIsDeletedType() {
        String dsl = doc(
            start() + ","
                + "{\"id\":\"assignee_0\",\"type\":\"assignee\",\"data\":{\"title\":\"负责人标记_1\"},"
                + "\"meta\":{\"position\":{\"x\":1,\"y\":0}}},"
                + endWithRef("start_0", "q"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"end_0\"}");
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(dsl);
        assertTrue(codes(issues).contains("UNKNOWN_TYPE"), "已删除类型必须被打回: " + issues);
    }

    @Test
    @DisplayName("S1: 重复 id → DUPLICATE_ID")
    void duplicateId() {
        String dsl = doc(
            start() + "," + start().replace("start_0", "start_0"),
            "");
        Set<String> c = codes(WorkflowDslValidator.validate(dsl));
        assertTrue(c.contains("DUPLICATE_ID"));
        assertTrue(c.contains("MULTI_START"));
    }

    // ---------- S2 拓扑 ----------

    @Test
    @DisplayName("S2: 缺 start → NO_START；缺 end → NO_END")
    void missingStartAndEnd() {
        String lonely = doc(
            "{\"id\":\"llm_0\",\"type\":\"llm\",\"data\":{\"inputsValues\":{\"prompt\":{\"type\":\"template\","
                + "\"content\":\"hi\"}}},\"meta\":{\"position\":{\"x\":0,\"y\":0}}}", "");
        Set<String> c = codes(WorkflowDslValidator.validate(lonely));
        assertTrue(c.contains("NO_START"));
        assertTrue(c.contains("NO_END"));
    }

    @Test
    @DisplayName("S2: 两个 start → MULTI_START")
    void multiStart() {
        String dsl = doc(start() + "," + start().replace("\"start_0\"", "\"start_1\"")
            .replace("\"x\":0", "\"x\":1"), "");
        Set<String> c = codes(WorkflowDslValidator.validate(dsl));
        assertTrue(c.contains("MULTI_START"));
    }

    @Test
    @DisplayName("S2: 两个 end → MULTI_END（出口唯一，与 start 对称；分支各接一个 end 的旧写法必须打回）")
    void multiEnd() {
        String dsl = doc(
            start() + ","
                + "{\"id\":\"condition_0\",\"type\":\"condition\",\"data\":{\"title\":\"判断\",\"conditions\":[{\"key\":\"if_match\","
                + "\"value\":{\"left\":{\"type\":\"ref\",\"content\":[\"start_0\",\"q\"]},\"operator\":\"contains\","
                + "\"right\":{\"type\":\"constant\",\"content\":\"x\"}}}]},\"meta\":{\"position\":{\"x\":1,\"y\":0}}},"
                + endWithRef("start_0", "q") + ","
                + endWithRef("start_0", "q").replace("\"end_0\"", "\"end_1\"").replace("\"x\":9", "\"x\":10"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"condition_0\"},"
                + "{\"sourceNodeID\":\"condition_0\",\"sourcePortID\":\"if_match\",\"targetNodeID\":\"end_0\"},"
                + "{\"sourceNodeID\":\"condition_0\",\"sourcePortID\":\"else\",\"targetNodeID\":\"end_1\"}");
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(dsl);
        assertTrue(codes(issues).contains("MULTI_END"), "两个 end 必须被打回: " + issues);
        WorkflowDslValidator.Issue multiEnd = issues.stream()
            .filter(i -> "MULTI_END".equals(i.getCode())).findFirst().orElseThrow();
        assertEquals("error", multiEnd.getLevel());
        assertEquals("end_0,end_1", multiEnd.getNodeId(), "nodeId 要点名全部 end，便于前端定位");
        assertTrue(multiEnd.getMessage().contains("汇合"), "打回信息要指引分支汇合到同一个 end");
        assertTrue(WorkflowDslValidator.hasErrors(issues));
        // 对照：单 end 的同一张图零 error
        String single = doc(
            start() + ","
                + "{\"id\":\"condition_0\",\"type\":\"condition\",\"data\":{\"title\":\"判断\",\"conditions\":[{\"key\":\"if_match\","
                + "\"value\":{\"left\":{\"type\":\"ref\",\"content\":[\"start_0\",\"q\"]},\"operator\":\"contains\","
                + "\"right\":{\"type\":\"constant\",\"content\":\"x\"}}}]},\"meta\":{\"position\":{\"x\":1,\"y\":0}}},"
                + endWithRef("start_0", "q"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"condition_0\"},"
                + "{\"sourceNodeID\":\"condition_0\",\"sourcePortID\":\"if_match\",\"targetNodeID\":\"end_0\"},"
                + "{\"sourceNodeID\":\"condition_0\",\"sourcePortID\":\"else\",\"targetNodeID\":\"end_0\"}");
        List<WorkflowDslValidator.Issue> singleIssues = WorkflowDslValidator.validate(single);
        assertFalse(codes(singleIssues).contains("MULTI_END"));
        assertFalse(WorkflowDslValidator.hasErrors(singleIssues), "分支汇合到同一 end 应零 error: " + singleIssues);
    }

    @Test
    @DisplayName("S2: 悬空边 → DANGLING_EDGE")
    void danglingEdge() {
        String dsl = doc(start() + "," + endWithRef("start_0", "q"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"ghost_0\"}");
        Set<String> c = codes(WorkflowDslValidator.validate(dsl));
        assertTrue(c.contains("DANGLING_EDGE"));
    }

    @Test
    @DisplayName("S2: 自环 → SELF_LOOP")
    void selfLoop() {
        String dsl = doc(start() + "," + endWithRef("start_0", "q"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"start_0\"}");
        Set<String> c = codes(WorkflowDslValidator.validate(dsl));
        assertTrue(c.contains("SELF_LOOP"));
    }

    @Test
    @DisplayName("S2: a→b→a 环 → CYCLE")
    void cycleDetection() {
        String dsl = doc(
            start() + ","
                + "{\"id\":\"a_0\",\"type\":\"variable\",\"data\":{\"inputsValues\":{}},\"meta\":{\"position\":{\"x\":1,\"y\":0}}},"
                + "{\"id\":\"b_0\",\"type\":\"variable\",\"data\":{\"inputsValues\":{}},\"meta\":{\"position\":{\"x\":2,\"y\":0}}},"
                + endWithRef("start_0", "q"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"a_0\"},"
                + "{\"sourceNodeID\":\"a_0\",\"targetNodeID\":\"b_0\"},"
                + "{\"sourceNodeID\":\"b_0\",\"targetNodeID\":\"a_0\"}");
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(dsl);
        assertTrue(codes(issues).contains("CYCLE"), "必须检出环: " + issues);
        assertTrue(issues.stream().filter(i -> "CYCLE".equals(i.getCode()))
            .findFirst().orElseThrow().getMessage().contains("a_0"), "环信息要含节点路径");
    }

    @Test
    @DisplayName("S2: start 无法到达 end → NO_PATH_TO_END")
    void noPathToEnd() {
        String dsl = doc(
            start() + ","
                + "{\"id\":\"llm_0\",\"type\":\"llm\",\"data\":{\"inputsValues\":{\"prompt\":{\"type\":\"template\","
                + "\"content\":\"hi\"}}},\"meta\":{\"position\":{\"x\":1,\"y\":0}}},"
                + endWithRef("start_0", "q"),
            "");
        Set<String> c = codes(WorkflowDslValidator.validate(dsl));
        assertTrue(c.contains("NO_PATH_TO_END"));
        assertTrue(c.contains("ISOLATED_NODE"));
    }

    @Test
    @DisplayName("S2: 不可达节点 → UNREACHABLE_NODE warning（不拦截）")
    void unreachableNodeIsWarning() {
        String dsl = doc(
            start() + ","
                // llm 凭证三件套必填化（2026-10-25 C06 契约）：不带凭证会引入无关 SEMANTIC error
                + "{\"id\":\"llm_0\",\"type\":\"llm\",\"data\":{\"inputsValues\":{\"prompt\":{\"type\":\"template\","
                + "\"content\":\"hi\"},\"modelName\":{\"type\":\"constant\",\"content\":\"m\"},"
                + "\"apiHost\":{\"type\":\"constant\",\"content\":\"https://x\"},"
                + "\"apiKey\":{\"type\":\"constant\",\"content\":\"sk-test\"}}},\"meta\":{\"position\":{\"x\":1,\"y\":1}}},"
                + endWithRef("start_0", "q"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"end_0\"}");
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(dsl);
        assertFalse(WorkflowDslValidator.hasErrors(issues), "不可达只是 warning: " + issues);
        assertTrue(codes(issues).contains("UNREACHABLE_NODE"));
    }

    // ---------- S4 引用 ----------

    @Test
    @DisplayName("S4: ref 指向不存在的节点 → DANGLING_REF error")
    void danglingRef() {
        String dsl = doc(start() + "," + endWithRef("ghost_0", "body"), "");
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(dsl);
        assertTrue(codes(issues).contains("DANGLING_REF"), "悬空 ref 必须打回: " + issues);
    }

    @Test
    @DisplayName("S4: 模板引用未知节点 id → TEMPLATE_REF_UNKNOWN warning")
    void templateRefToUnknownNode() {
        String dsl = doc(
            start() + ","
                + "{\"id\":\"llm_0\",\"type\":\"llm\",\"data\":{\"inputsValues\":{\"prompt\":{\"type\":\"template\","
                + "\"content\":\"总结：{{ ghost_0.text }}\"}}},\"meta\":{\"position\":{\"x\":1,\"y\":0}}},"
                + endWithRef("start_0", "q"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"llm_0\"},"
                + "{\"sourceNodeID\":\"llm_0\",\"targetNodeID\":\"end_0\"}");
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(dsl);
        // 2026-10-24 升 error：模板引用未知节点必须三方可感知（模型 violations / 前端弹错 / 后端拦截）
        assertTrue(WorkflowDslValidator.hasErrors(issues), "模板引用未知节点必须是 error: " + issues);
        assertTrue(codes(issues).contains("TEMPLATE_REF_UNKNOWN"));
    }

    @Test
    @DisplayName("S4: 正确的 ref/模板引用不报警")
    void validRefsPassSilently() {
        String dsl = doc(
            start() + ","
                + "{\"id\":\"llm_0\",\"type\":\"llm\",\"data\":{\"inputsValues\":{\"prompt\":{\"type\":\"template\","
                + "\"content\":\"总结：{{ start_0.q }}\",\"ref\":{\"type\":\"ref\",\"content\":[\"start_0\",\"q\"]}}}},"
                + "\"meta\":{\"position\":{\"x\":1,\"y\":0}}},"
                + endWithRef("llm_0", "result"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"llm_0\"},"
                + "{\"sourceNodeID\":\"llm_0\",\"targetNodeID\":\"end_0\"}");
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(dsl);
        assertFalse(issues.stream().anyMatch(i -> i.getCode().startsWith("DANGLING_REF")
            || i.getCode().startsWith("TEMPLATE_REF")), "合法引用不应报警: " + issues);
    }

    // ---------- S3 参数 schema 契约 ----------

    @Test
    @DisplayName("S3: http 节点缺 api → INVALID_PARAM（契约文件生效）")
    void httpWithoutApiViolatesContract() {
        String dsl = doc(
            start() + ","
                + "{\"id\":\"http_0\",\"type\":\"http\",\"data\":{\"title\":\"请求\"},\"meta\":{\"position\":{\"x\":1,\"y\":0}}},"
                + endWithRef("start_0", "q"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"http_0\"},"
                + "{\"sourceNodeID\":\"http_0\",\"targetNodeID\":\"end_0\"}");
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(dsl);
        assertTrue(codes(issues).contains("INVALID_PARAM"), "缺 api 必须命中契约: " + issues);
        assertTrue(issues.stream().filter(i -> "INVALID_PARAM".equals(i.getCode()))
            .findFirst().orElseThrow().getMessage().contains("api"));
    }

    @Test
    @DisplayName("S3: branches 缺 id / 非法 logic → INVALID_PARAM；合法结构零 error")
    void branchesContract() {
        String bad = doc(
            start() + ","
                + "{\"id\":\"br_0\",\"type\":\"branches\",\"data\":{\"branches\":[{\"logic\":\"xor\",\"conditions\":[]}]},"
                + "\"meta\":{\"position\":{\"x\":1,\"y\":0}}},"
                + endWithRef("start_0", "q"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"br_0\"},"
                + "{\"sourceNodeID\":\"br_0\",\"targetNodeID\":\"end_0\"}");
        assertTrue(codes(WorkflowDslValidator.validate(bad)).contains("INVALID_PARAM"));

        String good = doc(
            start() + ","
                + "{\"id\":\"br_0\",\"type\":\"branches\",\"data\":{\"branches\":[{\"id\":\"if_big\",\"title\":\"大\","
                + "\"logic\":\"and\",\"conditions\":[{\"key\":\"c1\",\"value\":{\"operator\":\"contains\","
                + "\"left\":{\"type\":\"ref\",\"content\":[\"start_0\",\"q\"]},"
                + "\"right\":{\"type\":\"constant\",\"content\":\"x\"}}}]}]},"
                + "\"meta\":{\"position\":{\"x\":1,\"y\":0}}},"
                + endWithRef("br_0", "if_big"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"br_0\"},"
                + "{\"sourceNodeID\":\"br_0\",\"sourcePortID\":\"if_big\",\"targetNodeID\":\"end_0\"}");
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(good);
        assertFalse(WorkflowDslValidator.hasErrors(issues), "合法 branches 不应报错: " + issues);
    }

    // ---------- S4 字段级引用 ----------

    @Test
    @DisplayName("S4: 引用 http 节点的不存在字段（旧模板的 result）→ DANGLING_REF_FIELD")
    void refToUnknownFieldOnHttp() {
        String dsl = doc(
            start() + ","
                + "{\"id\":\"http_0\",\"type\":\"http\",\"data\":{\"api\":{\"method\":\"GET\","
                + "\"url\":\"https://real.gaia.dev/api\"}},\"meta\":{\"position\":{\"x\":1,\"y\":0}}},"
                + endWithRef("http_0", "result"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"http_0\"},"
                + "{\"sourceNodeID\":\"http_0\",\"targetNodeID\":\"end_0\"}");
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(dsl);
        assertTrue(codes(issues).contains("DANGLING_REF_FIELD"),
            "http 输出是 body/headers/statusCode，引用 result 必须打回: " + issues);
    }

    @Test
    @DisplayName("S4: 引用动态输出节点（code 未声明 outputs）不误报")
    void refToUndeclaredDynamicOutput() {
        String dsl = doc(
            start() + ","
                + "{\"id\":\"code_0\",\"type\":\"code\",\"data\":{\"script\":{\"language\":\"javascript\","
                + "\"content\":\"({ x: 1 })\"}},\"meta\":{\"position\":{\"x\":1,\"y\":0}}},"
                + endWithRef("code_0", "anything"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"code_0\"},"
                + "{\"sourceNodeID\":\"code_0\",\"targetNodeID\":\"end_0\"}");
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(dsl);
        assertFalse(codes(issues).contains("DANGLING_REF_FIELD"), "未声明 outputs 的 code 是动态输出: " + issues);
    }

    @Test
    @DisplayName("S4: 引用 condition 的布尔端口（key/else）合法")
    void refToConditionPorts() {
        // 程序化构造，避免手写嵌套 JSON 的括号错误
        cn.hutool.json.JSONArray nodes = new cn.hutool.json.JSONArray()
            .set(cn.hutool.json.JSONUtil.parseObj(start()))
            .set(new cn.hutool.json.JSONObject()
                .set("id", "cond_0")
                .set("type", "condition")
                .set("data", new cn.hutool.json.JSONObject().set("conditions",
                    new cn.hutool.json.JSONArray().set(new cn.hutool.json.JSONObject()
                        .set("key", "if_match")
                        .set("value", new cn.hutool.json.JSONObject()
                            .set("left", ref("start_0", "q"))
                            .set("operator", "contains")
                            .set("right", constant("x"))))))
                .set("meta", position(1)))
            .set(new cn.hutool.json.JSONObject()
                .set("id", "end_0")
                .set("type", "end")
                .set("data", new cn.hutool.json.JSONObject().set("inputsValues",
                    new cn.hutool.json.JSONObject().set("out", ref("cond_0", "if_match"))))
                .set("meta", position(2)));
        cn.hutool.json.JSONArray edges = new cn.hutool.json.JSONArray()
            .set(edge("start_0", "cond_0", null))
            .set(edge("cond_0", "end_0", "if_match"));
        String dsl = new cn.hutool.json.JSONObject().set("nodes", nodes).set("edges", edges).toString();

        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(dsl);
        assertFalse(WorkflowDslValidator.hasErrors(issues), "condition 端口引用应放行: " + issues);
    }

    // ---------- 程序化构造工具 ----------

    private static cn.hutool.json.JSONObject ref(String nodeId, String field) {
        return new cn.hutool.json.JSONObject().set("type", "ref")
            .set("content", new cn.hutool.json.JSONArray().set(nodeId).set(field));
    }

    private static cn.hutool.json.JSONObject constant(String value) {
        return new cn.hutool.json.JSONObject().set("type", "constant").set("content", value);
    }

    private static cn.hutool.json.JSONObject position(int x) {
        return new cn.hutool.json.JSONObject().set("position",
            new cn.hutool.json.JSONObject().set("x", x).set("y", 0));
    }

    private static cn.hutool.json.JSONObject edge(String from, String to, String port) {
        cn.hutool.json.JSONObject e = new cn.hutool.json.JSONObject()
            .set("sourceNodeID", from).set("targetNodeID", to);
        if (port != null) {
            e.set("sourcePortID", port);
        }
        return e;
    }

    // ---------- 与 canonicalizer 的协作 ----------

    @Test
    @DisplayName("标注类节点经 canonicalize 保留后校验仍通过（画布导出→apply 通道）")
    void canonicalizedCanvasDocPasses() {
        String canvas = doc(
            start() + ","
                + "{\"id\":\"note_1\",\"type\":\"note\",\"data\":{\"title\":\"备注\",\"content\":\"x\"},"
                + "\"meta\":{\"position\":{\"x\":1,\"y\":1}}},"
                + endWithRef("start_0", "q"),
            "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"end_0\"}");
        WorkflowDslCanonicalizer.Result canonical = WorkflowDslCanonicalizer.canonicalize(canvas);
        assertTrue(canonical.getFatalIssues().isEmpty(),
            "note 节点不应 fatal: " + canonical.getFatalIssues());
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(canonical.getJson());
        assertFalse(WorkflowDslValidator.hasErrors(issues), "规范化后的画布文档应通过校验: " + issues);
    }
}
