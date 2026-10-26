package cn.boommanpro.gaia.workflow.app.node;

import cn.boommanpro.gaia.workflow.app.domain.testrun.input.SingleNodeRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.SingleNodeRunOutput;
import cn.boommanpro.gaia.workflow.app.executor.SingleNodeExecutor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 维度二：JSON 驱动的单节点执行测试。
 * <p>
 * 模拟前端编辑器传入节点 JSON + 模拟内存上下文，由 {@link SingleNodeExecutor} 解析并执行，
 * 验证可执行节点（start/end/code/string-format/variable/condition）的端到端正确性。
 * 这是「前端传 JSON，后端完成单节点测试」能力的回归底座。
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 */
@DisplayName("JSON 驱动单节点执行测试")
class SingleNodeExecutionTest extends AbstractNodeTest {

    private final SingleNodeExecutor executor = new SingleNodeExecutor();

    /** start 节点的输入以顶层 key 注入（模拟工作流输入参数） */
    private static final Map<String, Object> START_INPUTS = map("query", "Hello Flow.");
    /** 下游节点通过 start_0.query 引用，故内存以 start_0 为 key */
    private static final Map<String, Object> DOWNSTREAM_INPUTS = map("start_0", map("query", "World"));
    /** condition 匹配场景：query 等于 fixture 中的常量 "Hello Flow." */
    private static final Map<String, Object> CONDITION_MATCH_INPUTS = map("start_0", map("query", "Hello Flow."));

    @Test
    @DisplayName("start: 返回注入的输入参数")
    void executeStartNode() {
        SingleNodeRunOutput out = run("start", "start", START_INPUTS);
        assertTrue(out.isSuccess());
        assertEquals("Hello Flow.", out.getOutputs().get("query"));
    }

    @Test
    @DisplayName("end: 解析 ref 引用 start_0.query")
    void executeEndNode() {
        SingleNodeRunOutput out = run("end", "end", DOWNSTREAM_INPUTS);
        assertTrue(out.isSuccess());
        assertEquals("World", out.getOutputs().get("output"));
    }

    @Test
    @DisplayName("code(java): 动态编译执行返回 greeting/length")
    void executeCodeJavaNode() {
        SingleNodeRunOutput out = run("code", "code-java", DOWNSTREAM_INPUTS);
        assertTrue(out.isSuccess(), "java 代码节点应执行成功, error=" + out.getError());
        assertEquals("Hello, World!", out.getOutputs().get("greeting").toString());
        assertEquals(5, ((Number) out.getOutputs().get("length")).intValue());
    }

    @Test
    @DisplayName("code(groovy): 动态编译执行返回 greeting/upper")
    void executeCodeGroovyNode() {
        SingleNodeRunOutput out = run("code", "code-groovy", DOWNSTREAM_INPUTS);
        assertTrue(out.isSuccess(), "groovy 代码节点应执行成功, error=" + out.getError());
        assertEquals("Hello, World!", out.getOutputs().get("greeting").toString());
        assertEquals("WORLD", out.getOutputs().get("upper").toString());
    }

    @Test
    @DisplayName("code(javascript): GraalJS 执行返回 greeting/length")
    void executeCodeJavaScriptNode() {
        SingleNodeRunOutput out = run("code", "code-js", DOWNSTREAM_INPUTS);
        assertTrue(out.isSuccess(), "javascript 代码节点应执行成功, error=" + out.getError());
        assertEquals("Hello, World!", out.getOutputs().get("greeting").toString());
        assertEquals(5, ((Number) out.getOutputs().get("length")).intValue());
    }

    @Test
    @DisplayName("string-format: SpEL 模板渲染")
    void executeStringFormatNode() {
        SingleNodeRunOutput out = run("string-format", "string-format", DOWNSTREAM_INPUTS);
        assertTrue(out.isSuccess());
        assertEquals("Hello, World!", out.getOutputs().get("formatStringResult"));
    }

    @Test
    @DisplayName("variable: 常量赋值")
    void executeVariableNode() {
        SingleNodeRunOutput out = run("variable", "variable", null);
        assertTrue(out.isSuccess());
        assertEquals("Hello World", out.getOutputs().get("greeting"));
        assertEquals(42, ((Number) out.getOutputs().get("count")).intValue());
    }

    @Test
    @DisplayName("condition: 命中 if_match 分支")
    void executeConditionNodeMatch() {
        SingleNodeRunOutput out = run("condition", "condition", CONDITION_MATCH_INPUTS);
        assertTrue(out.isSuccess());
        assertEquals(Boolean.TRUE, out.getExecuteResult().get("if_match"));
    }

    @Test
    @DisplayName("condition: 未命中走 else 分支")
    void executeConditionNodeElse() {
        SingleNodeRunOutput out = run("condition", "condition", DOWNSTREAM_INPUTS);
        assertTrue(out.isSuccess());
        assertEquals(Boolean.FALSE, out.getExecuteResult().get("if_match"));
        assertEquals(Boolean.TRUE, out.getExecuteResult().get("else"));
    }

    @Test
    @DisplayName("http: 不可达服务时报失败（新错误语义：不再吞成 error 字段假成功）")
    void executeHttpNodeGracefulFailure() {
        // fixture 打真实 httpbin.org（网络通时是成功用例），不可达场景用本地保留端口构造
        SingleNodeRunInput input = new SingleNodeRunInput();
        input.setNode(unreachableHttpNode().toString());
        input.setInputs(null);
        SingleNodeRunOutput out = new SingleNodeExecutor().execute(input);
        // 第一档 A：节点失败必须失败——executor 捕获后 success=false + error 文案
        assertFalse(out.isSuccess(), "http 不可达时节点应判定失败");
        assertNotNull(out.getError());
    }

    /** 指向本地保留端口（连接必被拒绝）的 http 节点 */
    private static cn.hutool.json.JSONObject unreachableHttpNode() {
        return cn.hutool.json.JSONUtil.createObj()
            .set("id", "http_unreachable")
            .set("type", "http")
            .set("data", cn.hutool.json.JSONUtil.createObj()
                .set("title", "HTTP请求")
                .set("api", cn.hutool.json.JSONUtil.createObj()
                    .set("method", "GET")
                    .set("url", cn.hutool.json.JSONUtil.createObj()
                        .set("type", "constant")
                        .set("content", "http://127.0.0.1:1/ping")))
                .set("headersValues", cn.hutool.json.JSONUtil.createObj())
                .set("paramsValues", cn.hutool.json.JSONUtil.createObj())
                .set("body", cn.hutool.json.JSONUtil.createObj().set("bodyType", "none"))
                .set("timeout", cn.hutool.json.JSONUtil.createObj()
                    .set("timeout", 3000)
                    .set("retryTimes", 0))
                .set("outputs", cn.hutool.json.JSONUtil.createObj()
                    .set("type", "object")
                    .set("properties", cn.hutool.json.JSONUtil.createObj()
                        .set("body", cn.hutool.json.JSONUtil.createObj().set("type", "string"))
                        .set("headers", cn.hutool.json.JSONUtil.createObj().set("type", "object"))
                        .set("statusCode", cn.hutool.json.JSONUtil.createObj().set("type", "number")))));
    }

    @Test
    @DisplayName("llm: 不可达服务时报失败（新错误语义）")
    void executeLlmNodeGracefulFailure() {
        SingleNodeRunOutput out = run("llm", "llm", DOWNSTREAM_INPUTS);
        assertFalse(out.isSuccess(), "llm 不可达时节点应判定失败");
        assertNotNull(out.getError());
    }

    @Test
    @DisplayName("SingleNodeExecutor.isSupported: 仅非执行节点不支持单测（2026-10-17 全量放开，见 NodeExecutionL2Test）")
    void unsupportedControlFlowTypes() {
        assertFalse(executor.isSupported("group"));
        assertFalse(executor.isSupported("note"));
        assertFalse(executor.isSupported("comment"));
        assertFalse(executor.isSupported("assignee"));
        assertFalse(executor.isSupported("multi-condition"));
    }

    @Test
    @DisplayName("SingleNodeExecutor.isSupported: 可执行节点支持单测")
    void supportedExecutableTypes() {
        assertTrue(executor.isSupported("start"));
        assertTrue(executor.isSupported("end"));
        assertTrue(executor.isSupported("code"));
        assertTrue(executor.isSupported("string-format"));
        assertTrue(executor.isSupported("variable"));
        assertTrue(executor.isSupported("condition"));
        assertTrue(executor.isSupported("branches"));
        assertTrue(executor.isSupported("http"));
        assertTrue(executor.isSupported("llm"));
        assertTrue(executor.isSupported("loop"));
        assertTrue(executor.isSupported("workflow"));
        assertTrue(executor.isSupported("break"));
        assertTrue(executor.isSupported("continue"));
        assertTrue(executor.isSupported("block-start"));
        assertTrue(executor.isSupported("block-end"));
    }

    // ==================== 辅助方法 ====================

    private SingleNodeRunOutput run(String nodeType, String fixtureName, Map<String, Object> inputs) {
        SingleNodeRunInput input = new SingleNodeRunInput();
        input.setNode(loadNodeJson(fixtureName).toString());
        input.setInputs(inputs);
        return executor.execute(input);
    }

    private static Map<String, Object> map(String k, Object v) {
        Map<String, Object> m = new HashMap<>();
        m.put(k, v);
        return m;
    }

}
