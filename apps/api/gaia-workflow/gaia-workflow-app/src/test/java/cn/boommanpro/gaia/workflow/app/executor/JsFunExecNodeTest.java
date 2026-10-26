package cn.boommanpro.gaia.workflow.app.executor;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.base.type.RefType;
import cn.boommanpro.gaia.workflow.infra.extend.node.code.JsFunExecNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.URL;
import java.net.URLClassLoader;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * code 节点（GraalJS）回归：2026-10-24 会话 b6e34195 实证的两类故障。
 * 1) fat jar 下执行线程的上下文类加载器看不到 js/truffle 依赖 → 「未找到 GraalJS 引擎」/
 *    「No language and polyglot implementation」/「No implementation of HomeFinder」；
 * 2) 脚本异常被包成「GraalJS 执行失败」，真实的 ReferenceError 不可见，模型盲猜空转。
 */
@DisplayName("code 节点（GraalJS）：盲 CCL 线程可执行 + 变量注入 + 错误透传")
class JsFunExecNodeTest {

    private static JsFunExecNode nodeWithParam(String code) {
        JsFunExecNode node = new JsFunExecNode(code);
        Parameter x = new Parameter();
        x.setName("x");
        x.setRefType(RefType.REF);
        x.setRefValue(Arrays.asList("start_1", "x"));
        node.setParameters(Collections.singletonList(x));
        return node;
    }

    private static Chain chainWithStart(int xValue) {
        Chain chain = new Chain();
        Map<String, Object> start = new HashMap<>();
        start.put("x", xValue);
        chain.getMemory().put("start_1", start);
        return chain;
    }

    /** 在一个上下文类加载器看不到任何应用依赖的线程里执行（模拟 fat jar 工作流线程） */
    private static Object runOnBlindThread(java.util.function.Supplier<Object> action) throws InterruptedException {
        AtomicReference<Object> out = new AtomicReference<>();
        Thread t = new Thread(() -> {
            try {
                out.set(action.get());
            } catch (Throwable e) {
                out.set(e);
            }
        });
        t.setContextClassLoader(new URLClassLoader(new URL[0], ClassLoader.getPlatformClassLoader()));
        t.start();
        t.join();
        return out.get();
    }

    @Test
    @DisplayName("盲 CCL 线程上：上游变量按名注入，最后一个表达式即返回值，连续两次执行都成功")
    void executesOnBlindClassLoaderThread() throws InterruptedException {
        Object first = runOnBlindThread(() -> nodeWithParam("({v: x * 2})").execute(chainWithStart(21)));
        assertTrue(first instanceof Map, "首次执行应返回 Map，实际: " + first);
        assertEquals(42, ((Number) ((Map<?, ?>) first).get("v")).intValue());
        Object second = runOnBlindThread(() -> nodeWithParam("({v: x + 1})").execute(chainWithStart(1)));
        assertTrue(second instanceof Map, "二次执行应返回 Map，实际: " + second);
        assertEquals(2, ((Number) ((Map<?, ?>) second).get("v")).intValue());
    }

    @Test
    @DisplayName("input.xxx / inputs.xxx 别名与顶层变量等价（模型跨平台习惯写法）")
    void inputAliasesResolveToParameters() throws InterruptedException {
        Object result = runOnBlindThread(() -> nodeWithParam("({a: input.x, b: inputs.x, c: x})").execute(chainWithStart(7)));
        assertTrue(result instanceof Map, "应返回 Map，实际: " + result);
        Map<?, ?> map = (Map<?, ?>) result;
        assertEquals(7, ((Number) map.get("a")).intValue());
        assertEquals(7, ((Number) map.get("b")).intValue());
        assertEquals(7, ((Number) map.get("c")).intValue());
    }

    @Test
    @DisplayName("数组入参是真正的 JS 数组：items.map/reduce/length 可用；返回值深度转回 Java List/Map")
    void arraysInteropAndResultsConvertBack() throws InterruptedException {
        JsFunExecNode node = new JsFunExecNode(
            "({ total: items.map(i => i.qty * i.price).reduce((a, b) => a + b, 0), n: items.length,"
                + "  first: items[0].sku, echo: items, meta: { who: input.items.length } })");
        Parameter items = new Parameter();
        items.setName("items");
        items.setRefType(RefType.REF);
        items.setRefValue(Arrays.asList("start_1", "items"));
        node.setParameters(Collections.singletonList(items));

        Chain chain = new Chain();
        cn.hutool.json.JSONArray arr = new cn.hutool.json.JSONArray();
        arr.add(new cn.hutool.json.JSONObject().set("sku", "A").set("qty", 2).set("price", 10));
        arr.add(new cn.hutool.json.JSONObject().set("sku", "B").set("qty", 1).set("price", 5));
        Map<String, Object> start = new HashMap<>();
        start.put("items", arr);
        chain.getMemory().put("start_1", start);

        Object result = runOnBlindThread(() -> node.execute(chain));
        assertTrue(result instanceof Map, "应返回 Map，实际: " + result);
        Map<?, ?> out = (Map<?, ?>) result;
        assertEquals(25, ((Number) out.get("total")).intValue());
        assertEquals(2, ((Number) out.get("n")).intValue());
        assertEquals("A", out.get("first"));
        assertTrue(out.get("echo") instanceof java.util.List, "数组应转回 List，实际: " + out.get("echo").getClass());
        assertTrue(((java.util.List<?>) out.get("echo")).get(0) instanceof Map, "元素应转回 Map");
        assertTrue(out.get("meta") instanceof Map);
        assertEquals(2, ((Number) ((Map<?, ?>) out.get("meta")).get("who")).intValue());
    }

    @Test
    @DisplayName("引用未注入的变量：错误里有 ReferenceError 原文 + 变量名 + mockInputs 修法提示")
    void undefinedVariableErrorIsTransparent() throws InterruptedException {
        Object result = runOnBlindThread(() -> nodeWithParam("({v: rates.USD})").execute(chainWithStart(1)));
        assertTrue(result instanceof RuntimeException, "应抛出 RuntimeException，实际: " + result);
        String message = ((RuntimeException) result).getMessage();
        assertNotNull(message);
        assertTrue(message.contains("ReferenceError"), message);
        assertTrue(message.contains("rates is not defined"), message);
        assertTrue(message.contains("mockInputs"), message);
    }
}
