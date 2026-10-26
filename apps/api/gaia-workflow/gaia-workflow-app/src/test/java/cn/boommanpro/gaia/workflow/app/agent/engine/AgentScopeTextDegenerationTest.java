package cn.boommanpro.gaia.workflow.app.agent.engine;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 输出退化护栏：2026-10-24 会话 b6e34195 实证，模型把同一段分析原样复读几十遍、
 * 不再调用工具，run 以 done 收场却什么都没收尾。
 */
@DisplayName("输出退化检测：同一段落连续出现 ≥3 次即判退化")
class AgentScopeTextDegenerationTest {

    private static final String PARAGRAPH =
        "code_2 的 inputsValues 中 buyer 引用的是 code_1.buyer，而 code_1 的输出中 buyer 是 "
            + "{\"country\": \"US\", \"email\": \"buyer@example.com\"}。所以 code_2 中 buyer.country 应该是 US。"
            + "但 warehouseMap 中有 US 键，应该映射到 warehouse_us_east。为什么输出中 warehouse 是 warehouse_global？"
            + "让我检查 code_2 的脚本，看看是否有问题：实际上，从 http_5 的响应 body 中可以看到 destination 是 US，"
            + "说明 code_1 中 buyer.country 是 US。这可能是因为 code_2 的输入中 buyer 字段与 code_1 的输出不一致。\n\n";

    @Test
    @DisplayName("同一段落复读 3 遍 → 退化；2 遍不算")
    void threeRepeatsIsDegenerate() {
        String twice = "前言。\n" + PARAGRAPH + PARAGRAPH;
        assertFalse(AgentScopeExecutionEngine.looksDegenerate(twice));
        String thrice = twice + PARAGRAPH;
        assertTrue(AgentScopeExecutionEngine.looksDegenerate(thrice));
    }

    @Test
    @DisplayName("正常长文（内容各异）不误判")
    void variedLongTextIsFine() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 40; i++) {
            sb.append("第 ").append(i).append(" 步：配置节点 node_").append(i)
                .append(" 的参数，引用上游 start_1.field_").append(i)
                .append("，并把结果写入 outputs.result_").append(i).append("。\n");
        }
        assertFalse(AgentScopeExecutionEngine.looksDegenerate(sb));
    }

    @Test
    @DisplayName("截断复读：只保留到首次出现重复块为止")
    void trimKeepsSingleCopy() {
        String head = "前言，先说明一下背景。\n";
        String text = head + PARAGRAPH + PARAGRAPH + PARAGRAPH;
        String trimmed = AgentScopeExecutionEngine.trimRepetition(text);
        assertTrue(trimmed.length() < text.length());
        assertTrue(trimmed.startsWith(head.trim()));
        int kept = countOccurrences(trimmed, "为什么输出中 warehouse 是 warehouse_global");
        int total = countOccurrences(text, "为什么输出中 warehouse 是 warehouse_global");
        assertTrue(kept < total && kept <= 3, "截断后出现次数应明显少于原文，实际 kept=" + kept + " total=" + total);
    }

    private static int countOccurrences(String text, String needle) {
        int count = 0;
        int from = 0;
        while ((from = text.indexOf(needle, from)) >= 0) {
            count++;
            from += needle.length();
        }
        return count;
    }
}
