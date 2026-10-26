package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * llm 节点模型凭证三字段（modelName/apiHost/apiKey）统一必填（2026-10-26 用户决策「强制必填」）：
 * 此前 apiKey 空 fatal、modelName 空只 warning、apiHost 不查，空 apiHost 要到试跑才在 LlmNode 抛缺配置。
 */
class WorkflowDslCanonicalizerLlmCredentialTest {

    private static String llmDoc(String credentialsJson) {
        return """
            {
              "nodes": [
                {"id":"start_1","type":"start","data":{"title":"开始","outputs":{"type":"object","properties":{"text":{"type":"string"}}}}},
                {"id":"llm_1","type":"llm","data":{"title":"摘要","inputsValues":{
                  "prompt":{"type":"template","content":"总结：{{start_1.text}}"}%s
                }}},
                {"id":"end_1","type":"end","data":{"title":"结束","inputsValues":{"result":{"type":"ref","content":["llm_1","result"]}},"inputs":{"type":"object","properties":{"result":{"type":"string"}}}}}
              ],
              "edges": [
                {"sourceNodeID":"start_1","targetNodeID":"llm_1"},
                {"sourceNodeID":"llm_1","targetNodeID":"end_1"}
              ]
            }
            """.formatted(credentialsJson.isEmpty() ? "" : "," + credentialsJson);
    }

    private static List<String> credentialIssues(String doc) {
        return WorkflowDslCanonicalizer.businessFieldIssues(JSONUtil.parseObj(doc)).stream()
            .filter(i -> i.contains("模型凭证缺失"))
            .toList();
    }

    @Test
    @DisplayName("三个凭证齐全（constant）：无凭证 fatal")
    void allCredentialsPresentIsClean() {
        String doc = llmDoc("""
            "modelName":{"type":"constant","content":"glm-4-flash"},
            "apiHost":{"type":"constant","content":"https://example.invalid/v1"},
            "apiKey":{"type":"constant","content":"sk-test-placeholder"}
            """);
        assertThat(credentialIssues(doc)).isEmpty();
    }

    @Test
    @DisplayName("只填 apiKey：modelName/apiHost 一并点名为 fatal（不再只是 warning / 不查）")
    void missingModelNameAndApiHostIsFatal() {
        String doc = llmDoc("\"apiKey\":{\"type\":\"constant\",\"content\":\"sk-test-placeholder\"}");
        List<String> issues = credentialIssues(doc);
        assertThat(issues).hasSize(1);
        assertThat(issues.get(0))
            .contains("llm_1")
            .contains("modelName/apiHost")
            .doesNotContain("modelName/apiHost/apiKey")
            .contains("platformDefaultModel");
    }

    @Test
    @DisplayName("三个全空（含空串）：一条 fatal 点名全部三项，附带可直接执行的 update 修复示例")
    void allEmptyIsOneFatalNamingAll() {
        String doc = llmDoc("\"apiKey\":{\"type\":\"constant\",\"content\":\"   \"}");
        List<String> issues = credentialIssues(doc);
        assertThat(issues).hasSize(1);
        assertThat(issues.get(0))
            .contains("modelName/apiHost/apiKey")
            .contains("\"action\":\"update\"")
            .contains("<platformDefaultModel.apiHost>");
    }

    @Test
    @DisplayName("凭证用 ref 引用上游（如 start 入参）：静态无法判空，不误报")
    void refCredentialsAreNotFlagged() {
        String doc = llmDoc("""
            "modelName":{"type":"ref","content":["start_1","text"]},
            "apiHost":{"type":"ref","content":["start_1","text"]},
            "apiKey":{"type":"ref","content":["start_1","text"]}
            """);
        assertThat(credentialIssues(doc)).isEmpty();
    }

    @Test
    @DisplayName("凭证 fatal 是 error 级：businessFieldIssues 直接包含（落版/试跑门禁会拦）")
    void credentialFatalIsReturnedAsIssue() {
        JSONObject doc = JSONUtil.parseObj(llmDoc(""));
        assertThat(WorkflowDslCanonicalizer.businessFieldIssues(doc))
            .anyMatch(i -> i.contains("模型凭证缺失") && i.contains("modelName/apiHost/apiKey"));
    }
}
