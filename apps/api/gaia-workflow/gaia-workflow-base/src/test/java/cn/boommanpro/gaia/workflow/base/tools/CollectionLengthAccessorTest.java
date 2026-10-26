package cn.boommanpro.gaia.workflow.base.tools;

import cn.hutool.json.JSONArray;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("SpEL：集合/数组/字符串的 length/size 属性（模型 JS 习惯写法）")
class CollectionLengthAccessorTest {

    private static Map<String, Object> root() {
        Map<String, Object> root = new HashMap<>();
        Map<String, Object> start = new HashMap<>();
        start.put("items", new JSONArray(Arrays.asList("a", "b", "c")));
        start.put("tags", Arrays.asList(1, 2));
        start.put("arr", new String[]{"x", "y", "z", "w"});
        start.put("name", "gaia");
        Map<String, Object> withLengthKey = new HashMap<>();
        withLengthKey.put("length", "from-map");
        start.put("meta", withLengthKey);
        root.put("start_1", start);
        return root;
    }

    @Test
    @DisplayName("hutool JSONArray / List / 数组 / String 的 .length 与 .size 都能解析")
    void lengthAndSizeResolve() {
        SpringExpressionParser p = SpringExpressionParser.getInstance();
        assertEquals(3, (Integer) p.getValue("start_1.items.length", root()));
        assertEquals(3, (Integer) p.getValue("start_1.items.size", root()));
        assertEquals(2, (Integer) p.getValue("start_1.tags.length", root()));
        assertEquals(4, (Integer) p.getValue("start_1.arr.length", root()));
        assertEquals(4, (Integer) p.getValue("start_1.name.length", root()));
    }

    @Test
    @DisplayName("模板 {{ }} 与条件表达式里同样生效（高风险分支实证场景）")
    void templateAndCondition() {
        SpringExpressionParser p = SpringExpressionParser.getInstance();
        assertEquals("共 3 件", p.getVueStringValue("共 {{start_1.items.length}} 件", root()));
        assertEquals(Boolean.TRUE, p.getValue("start_1.items.length > 2", root()));
    }

    @Test
    @DisplayName("Map 的 length 键仍按键取值，不被劫持；不存在的键仍为 null")
    void mapKeyNotHijacked() {
        SpringExpressionParser p = SpringExpressionParser.getInstance();
        assertEquals("from-map", p.getValue("start_1.meta.length", root()));
        assertNull(p.getValue("start_1.missing", root()));
    }

    @Test
    @DisplayName("模板里引用数组 / 对象字段：序列化为 JSON 文本，而不是 EL1001E 转换失败（2026-10-24 实证）")
    void arraysAndMapsRenderAsJsonInTemplates() {
        SpringExpressionParser p = SpringExpressionParser.getInstance();
        String rendered = p.getVueStringValue("商品：{{start_1.items}}；元信息：{{start_1.meta}}；名字：{{start_1.name}}", root());
        assertTrue(rendered.contains("[\"a\",\"b\",\"c\"]"), rendered);
        assertTrue(rendered.contains("{\"length\":\"from-map\"}"), rendered);
        assertTrue(rendered.endsWith("名字：gaia"), rendered);
    }
}
