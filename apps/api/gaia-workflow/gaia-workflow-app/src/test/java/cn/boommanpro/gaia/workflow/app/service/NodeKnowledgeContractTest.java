package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 知识库与 schema 契约的对齐守护（防「文档 > 可执行集」漂移）：
 * agent 能建的每种类型必须有教学材料；分裂类型（multi-condition）不得出现在任何
 * 模型可见清单里；http 契约文件必须钉住 data.api 规范形状。
 */
class NodeKnowledgeContractTest {

    private static JSONArray knowledgeSeed() throws Exception {
        try (InputStream in = NodeKnowledgeContractTest.class.getResourceAsStream("/seed/node-knowledge.json")) {
            assertTrue(in != null, "seed/node-knowledge.json 必须存在");
            return JSONUtil.parseArray(new String(in.readAllBytes(), StandardCharsets.UTF_8));
        }
    }

    @Test
    @DisplayName("知识库覆盖 agent 可建的全部节点类型（缺教材 = 模型瞎写）")
    void knowledgeCoversAllSupportedTypes() throws Exception {
        Set<String> documented = new HashSet<>();
        for (Object item : knowledgeSeed()) {
            JSONObject entry = (JSONObject) item;
            String nodeType = entry.getStr("nodeType");
            if (nodeType != null) {
                documented.add(nodeType);
            }
        }
        for (String type : WorkflowDslCanonicalizer.supportedTypes()) {
            assertTrue(documented.contains(type),
                "agent 可建类型 \"" + type + "\" 没有知识库词条，get(target=knowledge) 会查空");
        }
    }

    @Test
    @DisplayName("multi-condition/assignee 不出现在知识库（下架/删除类型，防止模型重建）")
    void removedTypesAbsentFromKnowledge() throws Exception {
        for (Object item : knowledgeSeed()) {
            JSONObject entry = (JSONObject) item;
            assertFalse("multi-condition".equals(entry.getStr("nodeType")),
                "multi-condition 已下架，知识库不应再教模型建它");
            assertFalse("assignee".equals(entry.getStr("nodeType")),
                "assignee（负责人节点）2026-10-28 已整体删除，知识库不应再教模型建它");
        }
    }

    @Test
    @DisplayName("类型白名单门禁：multi-condition 不可由 agent 创建")
    void supportedTypeGate() {
        assertFalse(WorkflowDslCanonicalizer.isSupportedType("multi-condition"));
        assertFalse(WorkflowDslCanonicalizer.isSupportedType("assignee"),
            "assignee（负责人节点）已整体删除，不得重新进入 agent 可建清单");
        assertTrue(WorkflowDslCanonicalizer.isSupportedType("comment"));
    }

    @Test
    @DisplayName("契约文件覆盖所有 agent 可建的带参类型，http 契约钉住 data.api 形状")
    void schemaContractCoversTypes() {
        List<String> paramTypes = List.of("start", "end", "code", "branches", "condition",
            "string-format", "variable", "http", "llm", "loop");
        for (String type : paramTypes) {
            assertTrue(NodeSchemaRegistry.hasSchema(type),
                "类型 \"" + type + "\" 缺少 node-schemas 契约文件");
        }
        String httpSchema = NodeSchemaRegistry.rawSchema("http");
        assertTrue(httpSchema.contains("\"api\""), "http 契约必须声明 api 必填（形状统一锚点）");
        assertTrue(NodeSchemaRegistry.staticOutputs("http").containsAll(List.of("body", "headers", "statusCode")),
            "http 契约必须声明引擎真实输出");
        assertTrue(NodeSchemaRegistry.staticOutputs("llm").contains("result"), "llm 输出键是 result");
    }
}
