package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.infra.extend.node.branch.BranchesNode;
import cn.boommanpro.gaia.workflow.infra.extend.node.branch.BranchesNodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.condition.ConditionNode;
import cn.boommanpro.gaia.workflow.infra.extend.node.condition.ConditionNodeParser;
import cn.hutool.core.io.FileUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 动态输出物化 parity 契约（2026-10-29）：condition/branches 的 outputs 此前不在文档里，
 * 引擎运行时产出 condition_x.&lt;key&gt;/else 布尔值而画布变量引擎查不到——同一引用在
 * 后端合法、前端误报 Unknown Variable。
 *
 * <p>三层口径必须对同一份样例给出同一答案（样例为前后端共享的
 * specs/node-contracts/fixtures/dynamic-node-outputs.json，前端测试
 * apps/console/src/nodes/__tests__/derived-outputs.test.ts 读同一文件）：</p>
 * <ul>
 *   <li>归一化产物（NodeDataNormalizer → 画布/AI 保存落库的规范形）</li>
 *   <li>运行时输出（ConditionNode/BranchesNode.getOutputParameters → 引擎真实产出）</li>
 *   <li>校验推断（WorkflowDslValidator.inferOutputFields → 引用校验白名单）</li>
 * </ul>
 * 规则单边改动会导致本测试或前端测试红灯。
 */
class NodeDataNormalizerDynamicOutputsContractTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** 从运行目录上溯定位仓库根的共享契约样例（surefire 工作目录=模块 basedir） */
    private static JsonNode fixture() {
        Path dir = Paths.get(System.getProperty("user.dir")).toAbsolutePath();
        while (dir != null) {
            Path candidate = dir.resolve("specs/node-contracts/fixtures/dynamic-node-outputs.json");
            if (candidate.toFile().exists()) {
                try {
                    return MAPPER.readTree(FileUtil.readUtf8String(candidate.toFile()));
                } catch (Exception e) {
                    throw new IllegalStateException("契约样例不是合法 JSON", e);
                }
            }
            dir = dir.getParent();
        }
        throw new IllegalStateException(
            "找不到 specs/node-contracts/fixtures/dynamic-node-outputs.json（从 "
                + System.getProperty("user.dir") + " 上溯均未命中）");
    }

    /** case 的配置数组 JSON 文本（conditions / branches；缺配为 null） */
    private static String configJson(JsonNode c) {
        String key = "condition".equals(c.get("type").asText()) ? "conditions" : "branches";
        JsonNode config = c.get(key);
        return config == null || config.isNull() ? null : config.toString();
    }

    /** 契约期望的字段名（按声明顺序：keys/ids…，else 恒在最后） */
    private static List<String> expectedFieldOrder(JsonNode c) {
        List<String> names = new ArrayList<>();
        c.get("expectedOutputs").get("properties").fieldNames().forEachRemaining(names::add);
        return names;
    }

    @Test
    void normalizedOutputsMatchContractFixture() throws Exception {
        JsonNode cases = fixture().get("cases");
        assertTrue(cases.size() >= 6, "契约样例数量异常");
        for (JsonNode c : cases) {
            String type = c.get("type").asText();
            String configJson = configJson(c);

            JSONObject data = new JSONObject();
            if (configJson != null) {
                data.set("condition".equals(type) ? "conditions" : "branches",
                    JSONUtil.parseArray(configJson));
            }
            NodeDataNormalizer.normalize(type, data);

            JSONObject outputs = data.getJSONObject("outputs");
            assertEquals("object", outputs.getStr("type"), c.get("name").asText() + " outputs.type");
            JSONObject expected = JSONUtil.parseObj(
                c.get("expectedOutputs").get("properties").toString());
            assertEquals(expected, outputs.getJSONObject("properties"),
                c.get("name").asText() + " 归一化 outputs 与契约样例不一致");

            // 物化产物必须通过严格 schema（additionalProperties:false）——归一化永远先于校验执行，
            // 物化形状与契约脱节会在保存边界炸出假阳性。
            // 例外：源头配置本身违反 schema 的用例（blank-keys 违反 key minLength:1、
            // missing-config 违反 conditions required——源头就该被拒），只验证输出声明侧对空名/缺配的容忍。
            if (!java.util.Set.of("condition-skips-blank-keys", "condition-missing-config")
                .contains(c.get("name").asText())) {
                assertTrue(NodeSchemaRegistry.validateParams(type, data.toString()).isEmpty(),
                    c.get("name").asText() + " 物化产物未通过 schema 校验");
            }

            // 幂等：重复归一化不漂移（画布保存/AI 更新双入口反复触达）
            NodeDataNormalizer.normalize(type, data);
            assertEquals(outputs, data.getJSONObject("outputs"),
                c.get("name").asText() + " 二次归一化发生漂移");
        }
    }

    @Test
    void canonicalizeMaterializesOutputsForLegacyDrafts() {
        // 存量草稿形状：condition 无 outputs + 下游模板引用 condition 的 key——
        // 模拟保存边界（canonicalize）后 outputs 必须被补齐（验收标准：模型直写 DSL 缺声明在入口修正）
        JSONObject data = new JSONObject();
        data.set("conditions", JSONUtil.parseArray(
            "[{\"key\":\"if_pass\",\"value\":{\"operator\":\"is_true\",\"left\":{\"type\":\"ref\",\"content\":[\"start_0\",\"flag\"]}}}]"));
        String doc = new JSONObject()
            .set("nodes", new cn.hutool.json.JSONArray()
                .set(new JSONObject().set("id", "start_0").set("type", "start")
                    .set("data", new JSONObject().set("outputs",
                        new JSONObject().set("type", "object")
                            .set("properties", new JSONObject().set("flag",
                                new JSONObject().set("type", "boolean").set("default", false))))))
                .set(new JSONObject().set("id", "condition_0").set("type", "condition")
                    .set("data", data))
                .set(new JSONObject().set("id", "end_0").set("type", "end")
                    .set("data", new JSONObject().set("inputsValues",
                        new JSONObject().set("result",
                            new JSONObject().set("type", "template")
                                .set("content", "{{condition_0.if_pass}}"))))))
            .set("edges", new cn.hutool.json.JSONArray()
                .set(new JSONObject().set("sourceNodeID", "start_0").set("targetNodeID", "condition_0"))
                .set(new JSONObject().set("sourceNodeID", "condition_0").set("targetNodeID", "end_0")
                    .set("sourcePortID", "if_pass")))
            .toString();

        WorkflowDslCanonicalizer.Result result = WorkflowDslCanonicalizer.canonicalize(doc);
        assertTrue(result.getFatalIssues().isEmpty(),
            "合法草稿不应有 fatal：" + result.getFatalIssues());
        JSONObject canonical = JSONUtil.parseObj(result.getJson());
        JSONObject condData = null;
        for (Object n : canonical.getJSONArray("nodes")) {
            JSONObject node = (JSONObject) n;
            if ("condition_0".equals(node.getStr("id"))) {
                condData = node.getJSONObject("data");
            }
        }
        assertEquals(new JSONObject()
                .set("if_pass", new JSONObject().set("type", "boolean"))
                .set("else", new JSONObject().set("type", "boolean")),
            condData.getJSONObject("outputs").getJSONObject("properties"),
            "canonicalize 未给存量草稿补齐 condition 动态输出物化");
    }

    @Test
    void runtimeOutputsMatchContractFixture() {
        for (JsonNode c : fixture().get("cases")) {
            String type = c.get("type").asText();
            String configJson = configJson(c);

            JSONObject data = new JSONObject();
            if (configJson != null) {
                data.set("condition".equals(type) ? "conditions" : "branches",
                    JSONUtil.parseArray(configJson));
            }
            JSONObject nodeJson = new JSONObject()
                .set("id", type + "_0")
                .set("type", type)
                .set("data", data);

            List<String> runtime;
            if ("condition".equals(type)) {
                ConditionNode node = new ConditionNodeParser().buildInstance(nodeJson, new GaiaWorkflow("{}"));
                runtime = node.getOutputParameters().stream().map(Parameter::getName).toList();
            } else {
                BranchesNode node = new BranchesNodeParser().buildInstance(nodeJson, new GaiaWorkflow("{}"));
                runtime = node.getOutputParameters().stream().map(Parameter::getName).toList();
            }
            assertEquals(expectedFieldOrder(c), runtime,
                c.get("name").asText() + " 运行时 getOutputParameters 与契约样例不一致");
        }
    }

    @Test
    void validatorInferenceMatchesContractFixture() {
        for (JsonNode c : fixture().get("cases")) {
            String type = c.get("type").asText();
            String configJson = configJson(c);

            JSONObject data = new JSONObject();
            if (configJson != null) {
                data.set("condition".equals(type) ? "conditions" : "branches",
                    JSONUtil.parseArray(configJson));
            }
            JSONObject node = new JSONObject()
                .set("id", type + "_0")
                .set("type", type)
                .set("data", data);

            Map<String, String> typeById = Map.of(type + "_0", type);
            Map<String, Set<String>> known = WorkflowDslValidator.inferOutputFields(
                new ArrayList<>(List.of(node)), typeById);
            assertEquals(new LinkedHashSet<>(expectedFieldOrder(c)), known.get(type + "_0"),
                c.get("name").asText() + " 校验推断 inferOutputFields 与契约样例不一致");
        }
    }
}
