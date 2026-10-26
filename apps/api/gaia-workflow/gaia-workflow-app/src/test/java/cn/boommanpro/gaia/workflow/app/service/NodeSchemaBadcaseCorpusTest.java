package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.infra.extend.node.branch.BranchesNode;
import cn.boommanpro.gaia.workflow.infra.extend.node.code.CodeNodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.condition.ConditionNode;
import cn.boommanpro.gaia.workflow.infra.extend.node.loop.LoopNodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.stringformat.StringFormatCodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.variable.VariableNodeParser;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Badcase 语料测试（2026-10-24 全严格治理的语义验收）。
 *
 * <p>每条 badcase 都来自历史事故实录（SKILL 常见坑 / edge-rules / NodeDataNormalizer 与
 * Canonicalizer 注释里的日期化事故、知识库漂移实测），断言它在校验漏斗的
 * <b>最早一级</b> 被拦截：</p>
 * <ol>
 *   <li>契约层 {@code NodeSchemaRegistry.validateParams}（node add 软启动 / update / S3）</li>
 *   <li>业务探针层 {@code WorkflowDslCanonicalizer.businessFieldIssues}（add/update/run 预检）</li>
 *   <li>边即时层 {@code WorkflowDslCanonicalizer.edgeIssues}（edge connect 当场）</li>
 *   <li>全文档层 {@code WorkflowDslValidator.validate}（保存/落版/执行前）</li>
 *   <li>引擎层（parse 期 IllegalArgumentException / 执行期抛错，不再静默）</li>
 * </ol>
 * 验收硬指标：任何 badcase 不允许推迟到「运行成功却结果为空」的假成功状态。
 */
@DisplayName("节点 schema 治理 badcase 语料：最早一级拦截")
class NodeSchemaBadcaseCorpusTest {

    // ---------------- 助手 ----------------

    private static JSONObject node(String type, Object data) {
        JSONObject n = new JSONObject();
        n.set("id", type + "_t");
        n.set("type", type);
        if (data != null) {
            n.set("data", data instanceof JSONObject ? data : JSONUtil.parseObj(data.toString()));
        }
        return n;
    }

    private static JSONObject template(String content) {
        return new JSONObject().set("type", "template").set("content", content);
    }

    private static JSONObject constant(Object content) {
        return new JSONObject().set("type", "constant").set("content", content);
    }

    private static JSONObject ref(String nodeId, String field) {
        return new JSONObject().set("type", "ref").set("content", new JSONArray().set(nodeId).set(field));
    }

    /** 契约层校验：返回违规清单（空 = 放行） */
    private static List<String> contract(String type, JSONObject data) {
        NodeDataNormalizer.normalize(type, data);
        return NodeSchemaRegistry.validateParams(type, data.toString());
    }

    /** 业务探针层：返回 fatal 清单（空 = 放行） */
    private static List<String> business(String type, JSONObject data) {
        NodeDataNormalizer.normalize(type, data);
        return WorkflowDslCanonicalizer.businessFieldIssues(
            new JSONObject().set("nodes", new JSONArray().set(node(type, data))).set("edges", new JSONArray()));
    }

    /** add/update 双重校验的合并口径（NodeToolExecutor.prospectiveIssues 同序） */
    private static List<String> funnel(String type, JSONObject data) {
        List<String> all = new ArrayList<>(contract(type, data));
        all.addAll(business(type, data));
        return all;
    }

    // ---------------- 阴性对照：合法节点必须全绿 ----------------

    @Test
    @DisplayName("阴性对照：规范形状的 7 类节点全链路放行")
    void canonicalNodesPass() {
        assertTrue(funnel("llm", new JSONObject()
            .set("prompt", template("总结：{{ start_1.text }}"))
            .set("temperature", 0.3)
            .set("modelName", constant("glm-4-flash"))
            .set("apiHost", constant("https://www.dmxapi.cn/v1"))
            .set("apiKey", constant("sk-test"))).isEmpty(), "llm 规范形状应放行（凭证三件套必填）");

        assertTrue(funnel("http", new JSONObject()
            .set("api", new JSONObject().set("method", "POST").set("url", "https://httpbin.org/post"))
            .set("headersValues", new JSONObject().set("X-Test", constant("gaia")))
            .set("body", new JSONObject().set("bodyType", "JSON").set("json", template("{\"k\":\"v\"}")))).isEmpty(),
            "http 规范形状应放行");

        assertTrue(funnel("code", new JSONObject()
            .set("script", new JSONObject().set("language", "javascript").set("content", "({ result: 1 })"))
            .set("outputs", new JSONObject().set("type", "object")
                .set("properties", new JSONObject().set("result", new JSONObject().set("type", "number"))))).isEmpty(),
            "code 规范形状应放行");

        assertTrue(funnel("condition", new JSONObject()
            .set("conditions", new JSONArray().set(new JSONObject()
                .set("key", "if_match")
                .set("value", new JSONObject()
                    .set("left", ref("start_1", "text"))
                    .set("operator", "contains")
                    .set("right", constant("gaia")))))).isEmpty(), "condition 规范形状应放行");

        assertTrue(funnel("branches", new JSONObject()
            .set("branches", new JSONArray().set(new JSONObject()
                .set("id", "neg")
                .set("title", "负面")
                .set("logic", "or")
                .set("conditions", new JSONArray().set(new JSONObject()
                    .set("key", "c1")
                    .set("value", new JSONObject()
                        .set("left", ref("llm_1", "result"))
                        .set("operator", "contains")
                        .set("right", constant("负面")))))))).isEmpty(), "branches 规范形状应放行");

        assertTrue(funnel("variable", new JSONObject()
            .set("assign", new JSONArray().set(new JSONObject()
                .set("operator", "declare").set("left", "sum").set("right", constant(0))))).isEmpty(),
            "variable 规范形状应放行");

        assertTrue(funnel("workflow", new JSONObject()
            .set("workflowId", "wf_demo")
            .set("inputsValues", new JSONObject().set("q", ref("start_1", "text")))).isEmpty(),
            "workflow 规范形状应放行");
    }

    // ---------------- ① 契约层 badcase（add/update 当场） ----------------

    @Test
    @DisplayName("契约层：llm 字段拼错/prompt 包装错/温度非法/必填缺失/未知字段")
    void llmContractBadcases() {
        assertFalse(contract("llm", new JSONObject()
            .set("inputsValues", new JSONObject().set("modleName", constant("gpt")))).isEmpty(),
            "拼错字段名 modleName 必须被 additionalProperties:false 拒绝");

        assertFalse(contract("llm", new JSONObject()
            .set("inputsValues", new JSONObject().set("prompt", constant("总结")))).isEmpty(),
            "prompt 用 constant 包装必须被拒（只允许 template）");

        JSONObject noPrompt = new JSONObject().set("inputsValues", new JSONObject().set("temperature", constant(0.3)));
        assertFalse(contract("llm", noPrompt).isEmpty(), "缺 prompt 必须被 required 拒绝");

        assertFalse(contract("llm", new JSONObject()
            .set("prompt", template("x"))
            .set("temperature", "hot")).isEmpty()
            || contract("llm", new JSONObject()
                .set("prompt", template("x"))
                .set("temperature", constant("hot"))).isEmpty(),
            "temperature=hot 必须被拒（0-2 数字）");

        assertFalse(contract("llm", new JSONObject()
            .set("prompt", template("x"))
            .set("timeout", new JSONObject().set("timeout", 1000).set("retryTimes", -1))).isEmpty(),
            "retryTimes=-1 必须被拒（minimum 0）");
    }

    @Test
    @DisplayName("契约层：http method/bodyType 枚举、死字段、url 类型")
    void httpContractBadcases() {
        assertFalse(contract("http", new JSONObject()
            .set("api", new JSONObject().set("method", "FETCH").set("url", "https://x.dev"))).isEmpty(),
            "method=FETCH 必须被枚举拒绝");

        assertFalse(contract("http", new JSONObject()
            .set("api", new JSONObject().set("method", "POST").set("url", "https://x.dev"))
            .set("body", new JSONObject().set("bodyType", "form").set("json", "x"))).isEmpty(),
            "bodyType=form 必须被枚举拒绝（合法 none/JSON/raw-text）");

        assertFalse(contract("http", new JSONObject()
            .set("api", new JSONObject().set("method", "GET").set("url", "https://x.dev"))
            .set("inputsValues", new JSONObject().set("url", constant("https://legacy.dev")))).isEmpty(),
            "http 的 inputsValues 死字段必须被拒（引擎从不读，历史事故源）");

        assertFalse(contract("http", new JSONObject()
            .set("api", new JSONObject().set("method", "GET").set("url", 123))).isEmpty(),
            "url 裸数字必须被拒");

        assertFalse(contract("http", new JSONObject()
            .set("api", new JSONObject().set("method", "GET").set("url", "https://x.dev"))
            .set("headersValues", new JSONObject().set("X-A", new JSONObject().set("foo", 1)))).isEmpty(),
            "headersValues 值缺 type 包装必须被拒");
    }

    @Test
    @DisplayName("契约层：code 语言/内容/裸值")
    void codeContractBadcases() {
        assertFalse(contract("code", new JSONObject()
            .set("script", new JSONObject().set("language", "python").set("content", "print(1)"))).isEmpty(),
            "language=python 必须被枚举拒绝（此前运行期才炸）");

        JSONObject noContent = new JSONObject().set("script", new JSONObject().set("language", "javascript"));
        assertFalse(contract("code", noContent).isEmpty(), "script.content 缺失必须被 required 拒绝");

        assertFalse(contract("code", new JSONObject()
            .set("script", new JSONObject().set("language", "javascript").set("content", "1"))
            .set("inputsValues", new JSONObject().set("text", "裸字符串"))).isEmpty(),
            "inputsValues 裸字符串值必须被拒（此前 ClassCastException）");
    }

    @Test
    @DisplayName("契约层：condition/branches 的 operator 与 logic 枚举（neq/gte/lte 知识库漂移纠偏）")
    void conditionContractBadcases() {
        JSONObject badOperator = new JSONObject().set("conditions", new JSONArray().set(new JSONObject()
            .set("key", "if_match")
            .set("value", new JSONObject()
                .set("left", ref("start_1", "text"))
                .set("operator", "ne")   // 知识库曾误写 ne——引擎真值是 neq
                .set("right", constant(1)))));
        List<String> issues = contract("condition", badOperator);
        assertFalse(issues.isEmpty(), "operator=ne 必须被拒（引擎只认 neq，旧知识库写 ne 会静默 false）");
        assertTrue(issues.stream().anyMatch(i -> i.contains("neq")), "错误消息应包含正确枚举值 neq");

        assertFalse(contract("branches", new JSONObject()
            .set("branches", new JSONArray().set(new JSONObject()
                .set("id", "b1").set("logic", "AND")
                .set("conditions", new JSONArray())))).isEmpty(),
            "logic=AND 大写必须被拒（枚举只认小写 and/or）");

        assertFalse(contract("condition", new JSONObject()
            .set("conditions", new JSONArray().set(new JSONObject()
                .set("key", "if_match")
                .set("value", new JSONObject()
                    .set("left", true)   // 裸布尔操作数
                    .set("operator", "eq")
                    .set("right", constant(1)))))).isEmpty(),
            "left 裸布尔必须被拒");
    }

    @Test
    @DisplayName("契约层：loop/variable/string-format/workflow/end/start 形状")
    void miscContractBadcases() {
        assertFalse(contract("loop", new JSONObject()
            .set("maxLoopCount", "abc")).isEmpty(), "maxLoopCount=abc 必须被拒");

        // 2026-10-25 C09 实证改约：模型屡次把循环体 blocks/edges 写进 data，normalize 现在
        // 直接剥离（SessionWorkflowDraftService.relocateLoopContainerFields 搬到节点级），
        // data.blocks 不再触发契约拒绝，而是被吸收——此处验证剥离后放行
        assertTrue(contract("loop", new JSONObject()
            .set("blocks", new JSONArray())).isEmpty(), "loop data.blocks 应被 normalize 剥离后放行");

        assertFalse(contract("variable", new JSONObject()
            .set("assign", new JSONArray().set(new JSONObject()
                .set("operator", "declare").set("left", "sum").set("right", "裸字符串")))).isEmpty(),
            "variable right 裸字符串必须被拒（须包装）");

        assertFalse(contract("variable", new JSONObject()
            .set("inputsValues", new JSONObject())).isEmpty(), "variable inputsValues 死字段必须被拒");

        assertFalse(contract("string-format", new JSONObject()
            .set("script", new JSONObject().set("language", "mustache").set("content", "x"))).isEmpty(),
            "string-format language=mustache 必须被枚举拒绝");

        assertFalse(contract("workflow", new JSONObject()
            .set("workflowId", 123)).isEmpty(), "workflowId 裸数字必须被拒");

        assertFalse(contract("end", new JSONObject()
            .set("inputsValues", new JSONObject().set("result",
                new JSONObject().set("type", "ref").set("content", "start_1.query")))).isEmpty(),
            "ref content 字符串必须被拒（必须是 [nodeId, field] 数组）");

        assertFalse(contract("end", new JSONObject()
            .set("inputsValues", new JSONObject().set("result",
                new JSONObject().set("type", "ref").set("content", new JSONArray().set("start_1"))))).isEmpty(),
            "ref content 单元素必须被拒（minItems 2）");

        JSONObject rawStart = new JSONObject().set("outputs", new JSONObject().set("type", "object"));
        assertFalse(NodeSchemaRegistry.validateParams("start", rawStart.toString()).isEmpty(),
            "start outputs 缺 properties 必须被契约拒绝（未经归一化的原始形状）");
        // 归一化会确定性补齐 properties 骨架（画布/落库路径先 normalize 再校验）
        JSONObject normalizedStart = new JSONObject().set("outputs", new JSONObject().set("type", "object"));
        NodeDataNormalizer.normalize("start", normalizedStart);
        assertTrue(NodeSchemaRegistry.validateParams("start", normalizedStart.toString()).isEmpty(),
            "归一化补齐骨架后应通过契约");

        assertFalse(contract("comment", new JSONObject()
            .set("conditions", new JSONArray())).isEmpty(),
            "comment 塞业务字段必须被拒（trivial 契约只有 title）");
    }

    // ---------------- ② 业务探针层 badcase ----------------

    @Test
    @DisplayName("业务层：空壳节点与占位值 fatal")
    void businessBadcases() {
        assertFalse(business("llm", new JSONObject().set("prompt", template(""))).isEmpty(),
            "llm 空 prompt 必须 fatal");
        assertFalse(business("http", new JSONObject()
            .set("api", new JSONObject().set("method", "GET").set("url", ""))).isEmpty(),
            "http 空 url 必须 fatal");
        assertFalse(business("http", new JSONObject()
            .set("api", new JSONObject().set("method", "GET").set("url", "https://example.com/api"))).isEmpty(),
            "http example.com 占位 url 必须 fatal");
        assertFalse(business("code", new JSONObject()
            .set("script", new JSONObject().set("language", "javascript").set("content", ""))).isEmpty(),
            "code 空脚本必须 fatal");
        assertFalse(business("start", new JSONObject()
            .set("outputs", new JSONObject().set("type", "object").set("properties", new JSONObject()))).isEmpty(),
            "start 无输出参数必须 fatal");
        assertFalse(business("end", new JSONObject()
            .set("inputsValues", new JSONObject())).isEmpty(),
            "end 空 inputsValues 必须 fatal");
        assertFalse(business("condition", new JSONObject().set("conditions", new JSONArray())).isEmpty(),
            "condition 空条件列表必须 fatal");
        assertFalse(business("branches", new JSONObject().set("branches", new JSONArray())).isEmpty(),
            "branches 空分支列表必须 fatal");
        assertFalse(business("condition", new JSONObject()
            .set("conditions", new JSONArray().set(new JSONObject()
                .set("key", "if_match")
                .set("value", new JSONObject()
                    .set("left", ref("start_1", "text")))))).isEmpty(),
            "condition 缺 operator 必须 fatal（引擎会静默按 false）");
        assertFalse(business("workflow", new JSONObject()).isEmpty(),
            "workflow 缺 workflowId 必须 fatal");
    }

    // ---------------- ③ 边即时层 badcase（edge connect 当场） ----------------

    private static JSONObject canvasWithCondition() {
        return JSONUtil.parseObj(
            "{\"nodes\":[{\"id\":\"start_1\",\"type\":\"start\",\"data\":{\"outputs\":{\"type\":\"object\",\"properties\":{\"text" +
            "\":{\"type\":\"string\"}}}}},{\"id\":\"condition_1\",\"type\":\"condition\",\"data\":{\"conditions\":[{\"key\":\"if" +
            "_match\",\"value\":{\"left\":{\"type\":\"ref\",\"content\":[\"start_1\",\"text\"]},\"operator\":\"contains\",\"righ" +
            "t\":{\"type\":\"constant\",\"content\":\"gaia\"}}}]}},{\"id\":\"end_1\",\"type\":\"end\",\"data\":{\"inputsValues\":" +
            "{\"result\":{\"type\":\"ref\",\"content\":[\"condition_1\",\"if_match\"]}}}}],\"edges\":[]}");
    }

    @Test
    @DisplayName("边层：fromPort=true/false 与未知端口当场拒绝（2026-10-11 历史事故）")
    void edgePortBadcases() {
        JSONObject doc = canvasWithCondition();
        assertFalse(WorkflowDslCanonicalizer.edgeIssues(doc, "condition_1", "end_1", "true").isEmpty(),
            "fromPort=true 必须当场拒绝");
        assertFalse(WorkflowDslCanonicalizer.edgeIssues(doc, "condition_1", "end_1", "false").isEmpty(),
            "fromPort=false 必须当场拒绝");
        assertFalse(WorkflowDslCanonicalizer.edgeIssues(doc, "condition_1", "end_1", "not_exist_port").isEmpty(),
            "未知端口必须当场拒绝并列出合法端口");
        assertTrue(WorkflowDslCanonicalizer.edgeIssues(doc, "condition_1", "end_1", "if_match").isEmpty(),
            "合法端口 if_match 应放行");
        assertTrue(WorkflowDslCanonicalizer.edgeIssues(doc, "condition_1", "end_1", "else").isEmpty(),
            "兜底端口 else 应放行");
    }

    @Test
    @DisplayName("边层：端点不存在/自环/重复/普通节点带端口/条件节点缺端口")
    void edgeStructureBadcases() {
        JSONObject doc = canvasWithCondition();
        assertFalse(WorkflowDslCanonicalizer.edgeIssues(doc, "ghost", "end_1", null).isEmpty(),
            "源节点不存在必须当场拒绝");
        assertFalse(WorkflowDslCanonicalizer.edgeIssues(doc, "start_1", "ghost", null).isEmpty(),
            "目标节点不存在必须当场拒绝");
        assertFalse(WorkflowDslCanonicalizer.edgeIssues(doc, "start_1", "start_1", null).isEmpty(),
            "自环必须当场拒绝");
        assertFalse(WorkflowDslCanonicalizer.edgeIssues(doc, "start_1", "condition_1", "if_match").isEmpty(),
            "非条件节点带 fromPort 必须当场拒绝");
        assertFalse(WorkflowDslCanonicalizer.edgeIssues(doc, "condition_1", "end_1", null).isEmpty(),
            "条件节点出边不带 fromPort 必须当场拒绝");

        JSONObject withEdge = canvasWithCondition();
        withEdge.getJSONArray("edges").add(new JSONObject()
            .set("sourceNodeID", "start_1").set("targetNodeID", "condition_1"));
        assertFalse(WorkflowDslCanonicalizer.edgeIssues(withEdge, "start_1", "condition_1", null).isEmpty(),
            "重复边必须当场拒绝");
    }

    // ---------------- ④ 全文档层 badcase（保存/落版/执行前） ----------------

    @Test
    @DisplayName("全文档层：模板引用未知节点升 error（原 warning 静默假成功）")
    void templateRefUnknownIsError() {
        JSONObject doc = canvasWithCondition();
        doc.getJSONArray("nodes").add(new JSONObject().set("id", "llm_1").set("type", "llm")
            .set("data", new JSONObject().set("prompt", template("总结：{{ ghost_node.text }}"))));
        List<WorkflowDslValidator.Issue> issues = WorkflowDslValidator.validate(doc);
        assertTrue(issues.stream().anyMatch(i -> "TEMPLATE_REF_UNKNOWN".equals(i.getCode()) && "error".equals(i.getLevel())),
            "模板引用 ghost_node 必须是 error 级（三方可感知）");
    }

    @Test
    @DisplayName("全文档层：悬空 ref / chain 死类型 / 缺 data")
    void fullDocBadcases() {
        JSONObject doc = canvasWithCondition();
        doc.getJSONArray("nodes").getJSONObject(2).getJSONObject("data")
            .getJSONObject("inputsValues").set("result", ref("ghost_node", "field"));
        assertTrue(WorkflowDslValidator.validate(doc).stream()
                .anyMatch(i -> "DANGLING_REF".equals(i.getCode()) && "error".equals(i.getLevel())),
            "end 引用不存在节点必须是 DANGLING_REF error");

        JSONObject chainDoc = canvasWithCondition();
        chainDoc.getJSONArray("nodes").add(new JSONObject().set("id", "chain_1").set("type", "chain").set("data", new JSONObject()));
        assertTrue(WorkflowDslValidator.validate(chainDoc).stream()
                .anyMatch(i -> "UNKNOWN_TYPE".equals(i.getCode()) && "error".equals(i.getLevel())),
            "chain 死类型必须按 UNKNOWN_TYPE error 拒绝");

        JSONObject noDataDoc = canvasWithCondition();
        noDataDoc.getJSONArray("nodes").add(new JSONObject().set("id", "llm_x").set("type", "llm"));
        List<WorkflowDslValidator.Issue> noDataIssues = WorkflowDslValidator.validate(noDataDoc);
        assertTrue(noDataIssues.stream().anyMatch(i -> "MISSING_DATA".equals(i.getCode())),
            "llm 缺 data 必须 MISSING_DATA error");
        assertTrue(noDataIssues.stream().anyMatch(i -> "INVALID_PARAM".equals(i.getCode())),
            "llm 缺 data 时按 {} 校验必须同时命中 required");
    }

    // ---------------- ⑤ 引擎层：parse/执行期不再静默 ----------------

    @Test
    @DisplayName("引擎层：未知语言 parse 期即报（code/string-format）")
    void engineLanguageBadcases() {
        JSONObject codeNode = node("code", new JSONObject()
            .set("script", new JSONObject().set("language", "python").set("content", "print(1)")));
        assertThrows(IllegalArgumentException.class, () -> new CodeNodeParser().parse(codeNode, null),
            "code python 语言必须 parse 期报错（不再等运行期）");

        JSONObject sfNode = node("string-format", new JSONObject()
            .set("script", new JSONObject().set("language", "mustache").set("content", "x")));
        assertThrows(IllegalArgumentException.class, () -> new StringFormatCodeParser().parse(sfNode, null),
            "string-format mustache 语言必须 parse 期报错");
    }

    @Test
    @DisplayName("引擎层：loop maxLoopCount 非整数报配置错误；variable data 缺失不再 NPE")
    void engineRobustnessBadcases() {
        JSONObject loopNode = node("loop", new JSONObject().set("maxLoopCount", "abc"));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
            () -> new LoopNodeParser().parse(loopNode, null),
            "maxLoopCount=abc 必须报配置错误而不是裸 NumberFormatException");
        assertTrue(ex.getMessage().contains("maxLoopCount"), "报错应指明字段名");

        JSONObject variableNode = new JSONObject().set("id", "variable_t").set("type", "variable");
        assertDoesNotThrow(() -> new VariableNodeParser().parse(variableNode, null),
            "variable data 缺失应按空 assign 处理而不是 NPE");
    }

    @Test
    @DisplayName("引擎层：未知 operator/logic 执行期抛错（不再静默 false）")
    void engineExecuteBadcases() {
        ConditionNode conditionNode = new ConditionNode();
        ConditionNode.Condition condition = new ConditionNode.Condition();
        condition.setKey("if_match");
        ConditionNode.Expression expression = new ConditionNode.Expression();
        expression.setOperator("ne"); // 绕过 schema 直接构造——引擎兜底
        ConditionNode.ExpressionPart left = new ConditionNode.ExpressionPart();
        left.setType("constant");
        left.setContent("gaia");
        expression.setLeft(left);
        condition.setValue(expression);
        conditionNode.setConditions(new ArrayList<>(List.of(condition)));
        assertThrows(IllegalArgumentException.class, () -> conditionNode.execute(new Chain()),
            "未知 operator=ne 执行期必须抛错（不再 log.warn 后静默 false）");

        BranchesNode branchesNode = new BranchesNode();
        BranchesNode.Branch branch = new BranchesNode.Branch();
        branch.setId("b1");
        branch.setLogic(null);
        branch.setConditions(new ArrayList<>());
        BranchesNode.Condition branchCondition = new BranchesNode.Condition();
        branchCondition.setKey("c1");
        BranchesNode.Expression branchExpression = new BranchesNode.Expression();
        branchExpression.setOperator("contains");
        BranchesNode.ExpressionPart bLeft = new BranchesNode.ExpressionPart();
        bLeft.setType("constant");
        bLeft.setContent("x");
        branchExpression.setLeft(bLeft);
        branchCondition.setValue(branchExpression);
        branch.setConditions(new ArrayList<>(List.of(branchCondition)));
        branchesNode.setBranches(new ArrayList<>(List.of(branch)));
        assertThrows(IllegalArgumentException.class, () -> branchesNode.execute(new Chain()),
            "logic 缺失且有条件时必须抛错（不再静默 false）");
    }
}
