package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 连线端口校验（checkEdgePorts）+ 空壳 fatal 回归：2026-10-11 实证
 * fromPort 猜成 true/false、分支缺 else 边、end 无输出引用时引擎侧假成功/空产出，
 * 必须在落版/试运行前静态打回。
 */
class WorkflowDslCanonicalizerPortTest {

    /** end 带合法 inputsValues 引用（避免无关 fatal 干扰端口断言） */
    private static final String DOC_TEMPLATE = """
        {
          "nodes": [
            {"id":"start_1","type":"start","data":{"title":"开始","outputs":{"type":"object","properties":{"inputText":{"type":"string"}}}}},
            {"id":"condition_1","type":"condition","data":{"title":"判断","conditions":[{"key":"if_match","value":{"left":{"type":"ref","content":["start_1","inputText"]},"operator":"contains","right":{"type":"constant","content":"target"}}}]}},
            {"id":"end_true","type":"end","data":{"title":"包含","inputsValues":{"result":{"type":"ref","content":["condition_1","if_match"]}},"inputs":{"type":"object","properties":{"result":{"type":"boolean"}}}}},
            {"id":"end_false","type":"end","data":{"title":"不包含","inputsValues":{"result":{"type":"ref","content":["condition_1","if_match"]}},"inputs":{"type":"object","properties":{"result":{"type":"boolean"}}}}}
          ],
          "edges": %s
        }
        """;

    @Test
    void wrongPortIsFatal() {
        JSONObject doc = JSONUtil.parseObj(String.format(DOC_TEMPLATE,
            "[{\"sourceNodeID\":\"condition_1\",\"sourcePortID\":\"true\",\"targetNodeID\":\"end_true\"},"
                + "{\"sourceNodeID\":\"condition_1\",\"sourcePortID\":\"false\",\"targetNodeID\":\"end_false\"}]"));
        List<String> issues = WorkflowDslCanonicalizer.businessFieldIssues(doc);
        assertThat(issues).anyMatch(i -> i.contains("condition_1") && i.contains("\"true\"") && i.contains("if_match"))
            .anyMatch(i -> i.contains("\"action\":\"remove\"") && i.contains("fromPort"));
    }

    @Test
    void keyAndElsePortsPass() {
        JSONObject doc = JSONUtil.parseObj(String.format(DOC_TEMPLATE,
            "[{\"sourceNodeID\":\"condition_1\",\"sourcePortID\":\"if_match\",\"targetNodeID\":\"end_true\"},"
                + "{\"sourceNodeID\":\"condition_1\",\"sourcePortID\":\"else\",\"targetNodeID\":\"end_false\"}]"));
        assertThat(WorkflowDslCanonicalizer.businessFieldIssues(doc)).isEmpty();
    }

    @Test
    void missingElseEdgeIsWarningButKeyEdgeMissingIsFatal() {
        // 2026-10-11 落地校准：缺 else 降为 warning（引擎 fallback 保证单边结构功能正确，
        // E2E 双向实证）；缺 key 边仍为 fatal（命中场景主路径必须显式存在）。
        // 只连 if_match 一条边：fatal 里不应有 else 相关项
        JSONObject doc = JSONUtil.parseObj(String.format(DOC_TEMPLATE,
            "[{\"sourceNodeID\":\"start_1\",\"targetNodeID\":\"condition_1\"},"
                + "{\"sourceNodeID\":\"condition_1\",\"sourcePortID\":\"if_match\",\"targetNodeID\":\"end_true\"}]"));
        assertThat(WorkflowDslCanonicalizer.businessFieldIssues(doc)).isEmpty();
    }

    @Test
    void declaredKeyWithoutEdgeIsFatal() {
        JSONObject doc = JSONUtil.parseObj(String.format(DOC_TEMPLATE,
            "[{\"sourceNodeID\":\"start_1\",\"targetNodeID\":\"condition_1\"},"
                + "{\"sourceNodeID\":\"condition_1\",\"sourcePortID\":\"else\",\"targetNodeID\":\"end_false\"}]"));
        List<String> issues = WorkflowDslCanonicalizer.businessFieldIssues(doc);
        assertThat(issues).anyMatch(i -> i.contains("if_match") && i.contains("没有连线"));
    }

    @Test
    void portlessEdgesPass() {
        // 无端口的普通边（start→condition）不做端口校验；condition 自身双分支齐全
        JSONObject doc = JSONUtil.parseObj(String.format(DOC_TEMPLATE,
            "[{\"sourceNodeID\":\"start_1\",\"targetNodeID\":\"condition_1\"},"
                + "{\"sourceNodeID\":\"condition_1\",\"sourcePortID\":\"if_match\",\"targetNodeID\":\"end_true\"},"
                + "{\"sourceNodeID\":\"condition_1\",\"sourcePortID\":\"else\",\"targetNodeID\":\"end_false\"}]"));
        assertThat(WorkflowDslCanonicalizer.businessFieldIssues(doc)).isEmpty();
    }

    @Test
    void conditionWithoutOutgoingEdgesIsFatal() {
        // 2026-10-11 二轮实证：removeEdges 删掉非法边后忘记重建 → condition 无出边，
        // 引擎不筛分支下游全跑，条件白配。必须静态打回。
        JSONObject doc = JSONUtil.parseObj(String.format(DOC_TEMPLATE,
            "[{\"sourceNodeID\":\"start_1\",\"targetNodeID\":\"condition_1\"}]"));
        List<String> issues = WorkflowDslCanonicalizer.businessFieldIssues(doc);
        assertThat(issues).anyMatch(i -> i.contains("condition_1") && i.contains("没有任何出边") && i.contains("\"action\":\"connect\""));
    }

    @Test
    void emptyEndWithoutInputsIsFatal() {
        JSONObject doc = JSONUtil.parseObj("""
            {
              "nodes": [
                {"id":"start_1","type":"start","data":{"title":"开始","outputs":{"type":"object","properties":{"t":{"type":"string"}}}}},
                {"id":"end_1","type":"end","data":{"title":"结束"}}
              ],
              "edges": [{"sourceNodeID":"start_1","targetNodeID":"end_1"}]
            }
            """);
        List<String> issues = WorkflowDslCanonicalizer.businessFieldIssues(doc);
        assertThat(issues).anyMatch(i -> i.contains("end_1") && i.contains("没有引用任何上游输出"));
    }

    @Test
    void branchesPortsValidatedAgainstBranchIds() {
        JSONObject doc = JSONUtil.parseObj("""
            {
              "nodes": [
                {"id":"start_1","type":"start","data":{"title":"开始","outputs":{"type":"object","properties":{"t":{"type":"string"}}}}},
                {"id":"branches_1","type":"branches","data":{"title":"路由","branches":[{"id":"negative","title":"负面","logic":"and","conditions":[{"key":"c1","value":{"left":{"type":"ref","content":["start_1","t"]},"operator":"eq","right":{"type":"constant","content":"x"}}}]},{"id":"positive","title":"正面","logic":"and","conditions":[]}]}},
                {"id":"end_1","type":"end","data":{"title":"结束","inputsValues":{"result":{"type":"ref","content":["branches_1","c1"]}}}}
              ],
              "edges": [
                {"sourceNodeID":"branches_1","sourcePortID":"true","targetNodeID":"end_1"}
              ]
            }
            """);
        List<String> issues = WorkflowDslCanonicalizer.businessFieldIssues(doc);
        assertThat(issues).anyMatch(i -> i.contains("branches_1") && i.contains("\"true\""))
            .anyMatch(i -> i.contains("negative"));
    }

    @Test
    void canonicalizeRejectsWrongPortViaFatalIssues() {
        JSONObject doc = JSONUtil.parseObj(String.format(DOC_TEMPLATE,
            "[{\"sourceNodeID\":\"condition_1\",\"sourcePortID\":\"true\",\"targetNodeID\":\"end_true\"}]"));
        WorkflowDslCanonicalizer.Result result = WorkflowDslCanonicalizer.canonicalize(doc.toString());
        assertThat(result.getFatalIssues()).anyMatch(i -> i.contains("fromPort") && i.contains("if_match"));
    }
}
