package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * referenceIssues（S4 公开子集，2026-10-25 D1）规则用例：
 * node add/update 在写入当场调用，ownerFilter 只看目标节点——
 * 断裂引用（引用不存在节点 / 引用 llm 的非 result 字段）在生成点暴露，
 * 而不是等用户保存版本时才被 S4 打回（会话 b9019b24 实证）。
 * 模板字段级 warning（TEMPLATE_REF_FIELD）：head 命中但首段字段不在上游输出集；
 * length/size 是运行时内置访问器（CollectionLengthAccessor），跳过。
 */
@DisplayName("referenceIssues：生成点引用校验 + 模板字段级 warning")
class WorkflowDslValidatorReferenceIssuesTest {

    private static JSONObject node(String id, String type, JSONObject data) {
        return new JSONObject().set("id", id).set("type", type).set("data", data);
    }

    private static JSONObject startWith(String... fields) {
        JSONObject properties = new JSONObject();
        for (String field : fields) {
            properties.set(field, new JSONObject().set("type", "string"));
        }
        return node("start_1", "start", new JSONObject()
            .set("outputs", new JSONObject().set("type", "object").set("properties", properties)));
    }

    private static List<String> messages(List<WorkflowDslValidator.Issue> issues) {
        return issues.stream().map(WorkflowDslValidator.Issue::getMessage).collect(Collectors.toList());
    }

    @Test
    @DisplayName("ownerFilter：只返回目标节点的问题，其他节点的断裂引用不误报")
    void ownerFilterScopesIssues() {
        JSONObject good = node("end_1", "end", new JSONObject().set("inputsValues", new JSONObject()
            .set("q", new JSONObject().set("type", "ref").set("content", new JSONArray().set("start_1").set("q")))));
        JSONObject brokenOther = node("end_2", "end", new JSONObject().set("inputsValues", new JSONObject()
            .set("x", new JSONObject().set("type", "ref").set("content", new JSONArray().set("ghost").set("y")))));

        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.referenceIssues(
            new JSONArray().set(startWith("q")).set(good).set(brokenOther), "end_1");
        assertTrue(issues.isEmpty(), "end_1 自身引用合法，end_2 的问题不应算到它头上: " + issues);
    }

    @Test
    @DisplayName("ref 字段不在上游输出集 → DANGLING_REF_FIELD（引用 llm 的非 result 字段当场暴露）")
    void refFieldOutsideUpstreamOutputs() {
        JSONObject llm = node("llm_1", "llm", new JSONObject()
            .set("outputs", new JSONObject().set("type", "object").set("properties",
                new JSONObject().set("result", new JSONObject().set("type", "string")))));
        JSONObject cond = node("cond_1", "condition", new JSONObject().set("conditions", new JSONArray()
            .set(new JSONObject().set("key", "hit").set("value", new JSONObject()
                .set("left", new JSONObject().set("type", "ref")
                    .set("content", new JSONArray().set("llm_1").set("riskLevel")))
                .set("operator", "eq")
                .set("right", new JSONObject().set("type", "constant").set("content", "高"))))));

        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.referenceIssues(
            new JSONArray().set(startWith("q")).set(llm).set(cond), "cond_1");
        assertEquals(1, issues.size(), messages(issues).toString());
        assertEquals("DANGLING_REF_FIELD", issues.get(0).getCode());
        assertTrue(issues.get(0).getMessage().contains("riskLevel"));
    }

    @Test
    @DisplayName("llm json 输出模式：引用声明字段放行，未声明字段 DANGLING_REF_FIELD")
    void llmJsonModeInfersDeclaredOutputs() {
        JSONObject llmJson = node("llm_1", "llm", new JSONObject()
            .set("outputMode", "json")
            .set("outputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                .set("riskLevel", new JSONObject().set("type", "string")))));
        JSONObject endGood = node("end_1", "end", new JSONObject().set("inputsValues", new JSONObject()
            .set("a", new JSONObject().set("type", "ref").set("content", new JSONArray().set("llm_1").set("riskLevel")))));
        JSONObject endBad = node("end_2", "end", new JSONObject().set("inputsValues", new JSONObject()
            .set("b", new JSONObject().set("type", "ref").set("content", new JSONArray().set("llm_1").set("score")))));

        JSONArray nodes = new JSONArray().set(startWith("q")).set(llmJson).set(endGood).set(endBad);
        assertTrue(WorkflowDslValidator.referenceIssues(nodes, "end_1").isEmpty(),
            "json 模式声明字段可引用");
        List<WorkflowDslValidator.Issue> bad = WorkflowDslValidator.referenceIssues(nodes, "end_2");
        assertEquals(1, bad.size());
        assertEquals("DANGLING_REF_FIELD", bad.get(0).getCode());
        assertTrue(bad.get(0).getMessage().contains("score"));
    }

    @Test
    @DisplayName("模板引用不存在节点 → TEMPLATE_REF_UNKNOWN error；字段不在输出集 → TEMPLATE_REF_FIELD warning")
    void templateFieldLevelWarning() {
        JSONObject llm = node("llm_1", "llm", new JSONObject()
            .set("inputsValues", new JSONObject()
                .set("prompt", new JSONObject().set("type", "template")
                    .set("content", "{{ ghost.x }} {{ code_1.missing }} {{ start_1.q }} {{ start_1.items.length }}"))));
        JSONObject code = node("code_1", "code", new JSONObject()
            .set("outputs", new JSONObject().set("type", "object").set("properties",
                new JSONObject().set("result", new JSONObject().set("type", "string")))));

        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.referenceIssues(
            new JSONArray().set(startWith("q", "items")).set(code).set(llm), "llm_1");

        assertEquals(2, issues.size(), messages(issues).toString());
        assertTrue(issues.stream().anyMatch(i -> "error".equals(i.getLevel())
            && "TEMPLATE_REF_UNKNOWN".equals(i.getCode()) && i.getMessage().contains("ghost")));
        assertTrue(issues.stream().anyMatch(i -> "warning".equals(i.getLevel())
            && "TEMPLATE_REF_FIELD".equals(i.getCode()) && i.getMessage().contains("missing")),
            "code_1.missing 应给字段级 warning");
        // start_1.q（命中）与 start_1.items.length（length 是内置访问器）都不应产生问题
    }

    @Test
    @DisplayName("模板 {{x.items.length}}：length/size 尾段跳过字段级检查（运行时 CollectionLengthAccessor 支持）")
    void lengthSizeAccessorSkipped() {
        JSONObject http = node("http_1", "http", new JSONObject()
            .set("api", new JSONObject().set("method", "GET")
                .set("url", new JSONObject().set("type", "template").set("content", "{{ start_1.items.length }}")))
            .set("outputs", new JSONObject().set("type", "object").set("properties",
                new JSONObject().set("body", new JSONObject().set("type", "string")))));

        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.referenceIssues(
            new JSONArray().set(startWith("items")).set(http), "http_1");
        assertTrue(issues.isEmpty(), "length 是运行时内置访问器，不应报字段级问题: " + messages(issues));
    }
}
