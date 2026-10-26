package cn.boommanpro.gaia.workflow.app.executor;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.model.ChainNode;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.base.type.RefType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

@DisplayName("单节点试跑 mockInputs：按入参名直给自动桥接到引用位置")
class SingleNodeExecutorBridgeTest {

    private static Parameter ref(String name, String upstream, String field) {
        Parameter p = new Parameter();
        p.setName(name);
        p.setRefType(RefType.REF);
        p.setRefValue(Arrays.asList(upstream, field));
        return p;
    }

    private static ChainNode nodeWith(List<Parameter> params) {
        return new ChainNode() {
            @Override
            public Map<String, Object> execute(Chain chain) {
                return null;
            }

            @Override
            public List<Parameter> getParameters() {
                return params;
            }
        };
    }

    @Test
    @DisplayName("模型按入参名给 {rates, orderId}：桥接成 http_1.body / start_1.orderId（2026-10-24 实证场景）")
    void flatInputsBridgedToRefs() {
        Chain chain = new Chain();
        Map<String, Object> inputs = new HashMap<>();
        inputs.put("rates", "{\"USD\":1}");
        inputs.put("orderId", "ORD-1");
        chain.getMemory().putAll(inputs);
        SingleNodeExecutor.bridgeFlatMockInputs(chain,
            nodeWith(Arrays.asList(ref("rates", "http_1", "body"), ref("orderId", "start_1", "orderId"))), inputs);
        assertEquals("{\"USD\":1}", ((Map<?, ?>) chain.getMemory().get("http_1")).get("body"));
        assertEquals("ORD-1", ((Map<?, ?>) chain.getMemory().get("start_1")).get("orderId"));
    }

    @Test
    @DisplayName("已按上游节点 id 分组给出的值不被覆盖；未给的入参不凭空造桶")
    void groupedInputsUntouched() {
        Chain chain = new Chain();
        Map<String, Object> inputs = new HashMap<>();
        Map<String, Object> http = new HashMap<>();
        http.put("body", "REAL");
        inputs.put("http_1", http);
        inputs.put("rates", "FLAT");
        chain.getMemory().putAll(inputs);
        SingleNodeExecutor.bridgeFlatMockInputs(chain,
            nodeWith(Arrays.asList(ref("rates", "http_1", "body"), ref("weight", "code_9", "total"))), inputs);
        assertEquals("REAL", ((Map<?, ?>) chain.getMemory().get("http_1")).get("body"));
        assertFalse(chain.getMemory().containsKey("code_9"));
    }
}
