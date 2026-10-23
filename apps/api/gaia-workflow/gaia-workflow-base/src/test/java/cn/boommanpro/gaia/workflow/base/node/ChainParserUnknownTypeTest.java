package cn.boommanpro.gaia.workflow.base.node;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * ChainParser 对未知节点类型的防御：
 * 历史 bug 是 nodeParserMap.get(type).parse(...) 直接 NPE（500、无任何线索），
 * 现在必须抛带节点 id 与类型名的明确异常。
 */
class ChainParserUnknownTypeTest {

    @Test
    void unknownTypeShouldThrowExplicitExceptionInsteadOfNpe() {
        JSONArray nodes = new JSONArray();
        JSONObject node = new JSONObject();
        node.set("id", "node_bad_1");
        node.set("type", "multi-condition");
        nodes.add(node);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> new ChainParser().parse(nodes, new JSONArray(), null));
        assertTrue(ex.getMessage().contains("multi-condition"));
        assertTrue(ex.getMessage().contains("node_bad_1"));
    }

    @Test
    void registeredTypeStillParses() {
        // 注册一个最小解析器，验证白名单类型不受防御分支影响
        cn.boommanpro.gaia.workflow.base.model.ChainNode stub =
                new cn.boommanpro.gaia.workflow.base.model.ChainNode() {
                    @Override
                    public java.util.Map<String, Object> execute(
                            cn.boommanpro.gaia.workflow.base.model.Chain chain) {
                        return java.util.Collections.emptyMap();
                    }
                };
        String registeredType = "fake-ok-" + System.nanoTime(); // 避免污染静态注册表
        stub.setId("n1");
        ChainParser.registerNodeParser(registeredType, (nodeJSONObject, workflow) -> stub);
        JSONArray nodes = new JSONArray();
        JSONObject node = new JSONObject();
        node.set("id", "n1");
        node.set("type", registeredType);
        nodes.add(node);
        cn.boommanpro.gaia.workflow.base.model.Chain chain =
                new ChainParser().parse(nodes, new JSONArray(), null);
        assertEquals(1, chain.getNodes().size());
    }
}
