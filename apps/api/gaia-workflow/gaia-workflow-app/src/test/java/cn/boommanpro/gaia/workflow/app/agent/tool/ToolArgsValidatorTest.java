package cn.boommanpro.gaia.workflow.app.agent.tool;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("ToolArgsValidator：JSON Schema 子集校验")
class ToolArgsValidatorTest {

    private static final String SCHEMA = "{"
        + "\"type\":\"object\","
        + "\"required\":[\"workflowCode\",\"ops\"],"
        + "\"properties\":{"
        + "\"workflowCode\":{\"type\":\"string\",\"description\":\"工作流编码\"},"
        + "\"topK\":{\"type\":\"number\"},"
        + "\"confirmed\":{\"type\":\"boolean\"},"
        + "\"nodeType\":{\"type\":\"string\",\"enum\":[\"llm\",\"http\",\"code\"]},"
        + "\"ops\":{\"type\":\"array\",\"minItems\":1,\"items\":{"
        +   "\"type\":\"object\",\"required\":[\"op\"],\"properties\":{"
        +   "\"op\":{\"type\":\"string\",\"enum\":[\"addNode\",\"connect\"]},"
        +   "\"type\":{\"type\":\"string\"}"
        + "}}}}}";

    @Test
    @DisplayName("合法参数通过（零违规）")
    void validArgsPass() {
        JSONObject args = JSONUtil.parseObj(
            "{\"workflowCode\":\"wf_x\",\"ops\":[{\"op\":\"connect\",\"from\":\"a\",\"to\":\"b\"}]}");
        List<ToolArgsValidator.Violation> violations =
            ToolArgsValidator.validate(JSONUtil.parseObj(SCHEMA), args);
        assertTrue(violations.isEmpty(), violations.toString());
    }

    @Test
    @DisplayName("缺必填参数给出 path 级指引")
    void missingRequiredReported() {
        List<ToolArgsValidator.Violation> violations =
            ToolArgsValidator.validate(JSONUtil.parseObj(SCHEMA), JSONUtil.parseObj("{}"));
        assertEquals(2, violations.size());
        assertTrue(violations.stream().anyMatch(v -> "workflowCode".equals(v.getPath())));
        assertTrue(violations.stream().anyMatch(v -> "ops".equals(v.getPath())));
    }

    @Test
    @DisplayName("枚举外的值按 path 定位（数组元素下标）")
    void enumViolationIndexed() {
        JSONObject args = JSONUtil.parseObj(
            "{\"workflowCode\":\"wf_x\",\"ops\":[{\"op\":\"destroy\",\"type\":\"llm\"}]}");
        List<ToolArgsValidator.Violation> violations =
            ToolArgsValidator.validate(JSONUtil.parseObj(SCHEMA), args);
        assertEquals(1, violations.size());
        assertEquals("ops[0].op", violations.get(0).getPath());
        assertTrue(violations.get(0).getFix().contains("connect"));
    }

    @Test
    @DisplayName("类型错误与 minItems 都能捕获")
    void typeAndMinItems() {
        JSONObject args = JSONUtil.parseObj(
            "{\"workflowCode\":123,\"ops\":[]}");
        List<ToolArgsValidator.Violation> violations =
            ToolArgsValidator.validate(JSONUtil.parseObj(SCHEMA), args);
        assertTrue(violations.stream().anyMatch(v -> "workflowCode".equals(v.getPath())));
        assertTrue(violations.stream().anyMatch(v -> "ops".equals(v.getPath())));
    }

    @Test
    @DisplayName("数字字符串宽容放行（弱模型发 \"3\" 不算违规）")
    void numericStringTolerated() {
        JSONObject args = JSONUtil.parseObj(
            "{\"workflowCode\":\"wf_x\",\"ops\":[{\"op\":\"addNode\"}],\"topK\":\"3\"}");
        List<ToolArgsValidator.Violation> violations =
            ToolArgsValidator.validate(JSONUtil.parseObj(SCHEMA), args);
        assertTrue(violations.isEmpty(), violations.toString());
    }
}
