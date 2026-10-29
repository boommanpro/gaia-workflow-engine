package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 服务端布局引擎回归（2026-10-29 布局收口）：
 * · 任意两节点真实尺寸包围盒不得相交（旧 BFS 步长小于节点尺寸，同列垂直重叠 190px 的死穴）；
 * · 链路 x 单调向右（LR 分层）；
 * · 确定性：同输入两次布局逐字节一致（run 结束重排不跳动的结构保证）；
 * · force=false 只补缺失坐标（用户布局神圣不可侵犯）；force=true 全量重排；
 * · 环终止且有解。
 */
@DisplayName("WorkflowLayoutEngine：ELK layered 布局质量与契约")
class WorkflowLayoutEngineTest {

    // ---------------- 构造辅助 ----------------

    private static JSONObject node(String id, String type) {
        return new JSONObject().set("id", id).set("type", type)
            .set("data", new JSONObject().set("title", id));
    }

    private static JSONObject nodeAt(String id, String type, int x, int y) {
        return node(id, type).set("meta", new JSONObject().set("position",
            new JSONObject().set("x", x).set("y", y)));
    }

    private static JSONObject edge(String from, String to) {
        return new JSONObject().set("sourceNodeID", from).set("targetNodeID", to);
    }

    private static JSONObject doc(JSONObject... nodes) {
        JSONArray nodeArr = new JSONArray();
        for (JSONObject n : nodes) {
            nodeArr.set(n);
        }
        return new JSONObject().set("nodes", nodeArr).set("edges", new JSONArray());
    }

    private static void connect(JSONObject doc, String... path) {
        JSONArray edges = doc.getJSONArray("edges");
        for (int i = 0; i + 1 < path.length; i++) {
            edges.set(edge(path[i], path[i + 1]));
        }
    }

    /** 两节点真实尺寸包围盒相交断言用的尺寸读取（未知类型按引擎兜底） */
    private static int[] sizeOf(JSONObject node) {
        int[] size = WorkflowLayoutEngine.NODE_SIZES.get(node.getStr("type"));
        return size != null ? size : new int[]{360, 390};
    }

    private static Map<String, long[]> positions(JSONObject doc) {
        Map<String, long[]> result = new HashMap<>();
        for (Object o : doc.getJSONArray("nodes")) {
            JSONObject n = (JSONObject) o;
            JSONObject pos = n.getJSONObject("meta") == null ? null
                : n.getJSONObject("meta").getJSONObject("position");
            assertThat(pos).as("节点 %s 必须有坐标", n.getStr("id")).isNotNull();
            result.put(n.getStr("id"), new long[]{pos.getLong("x"), pos.getLong("y")});
        }
        return result;
    }

    /** 全对全包围盒不相交（真实节点尺寸） */
    private static void assertNoOverlap(JSONObject doc) {
        List<Object> nodes = doc.getJSONArray("nodes");
        for (int i = 0; i < nodes.size(); i++) {
            for (int j = i + 1; j < nodes.size(); j++) {
                JSONObject a = (JSONObject) nodes.get(i);
                JSONObject b = (JSONObject) nodes.get(j);
                long[] pa = positions(doc).get(a.getStr("id"));
                long[] pb = positions(doc).get(b.getStr("id"));
                int[] sa = sizeOf(a);
                int[] sb = sizeOf(b);
                boolean overlap = pa[0] < pb[0] + sb[0] && pb[0] < pa[0] + sa[0]
                    && pa[1] < pb[1] + sb[1] && pb[1] < pa[1] + sa[1];
                assertThat(overlap)
                    .as("节点 %s%sa 与 %s%sb 包围盒不得相交", a.getStr("id"), pa, b.getStr("id"), pb)
                    .isFalse();
            }
        }
    }

    private static void assertNonNegative(JSONObject doc) {
        positions(doc).forEach((id, p) -> {
            assertThat(p[0]).as("%s.x 非负", id).isGreaterThanOrEqualTo(0);
            assertThat(p[1]).as("%s.y 非负", id).isGreaterThanOrEqualTo(0);
        });
    }

    // ---------------- 用例 ----------------

    @Test
    @DisplayName("菱形图（分支汇合）全节点不重叠、链路向右")
    void diamondNoOverlap() {
        JSONObject d = doc(node("start", "start"), node("a", "llm"), node("b", "http"),
            node("merge", "code"), node("end", "end"));
        connect(d, "start", "a", "merge", "end");
        connect(d, "start", "b", "merge");

        WorkflowLayoutEngine.applyLayout(d, true);

        assertNoOverlap(d);
        assertNonNegative(d);
        Map<String, long[]> pos = positions(d);
        assertThat(pos.get("a")[0]).as("分支节点在 start 右侧").isGreaterThan(pos.get("start")[0]);
        assertThat(pos.get("merge")[0]).as("汇合节点在分支右侧").isGreaterThan(pos.get("a")[0]);
        assertThat(pos.get("end")[0]).as("end 在汇合右侧").isGreaterThan(pos.get("merge")[0]);
    }

    @Test
    @DisplayName("条件节点双分支（带端口）两路子节点不重叠")
    void conditionBranchesNoOverlap() {
        JSONObject cond = node("condition", "condition").set("data", new JSONObject()
            .set("title", "判断")
            .set("conditions", new JSONArray()
                .set(new JSONObject().set("key", "if_match"))));
        JSONObject d = doc(node("start", "start"), cond,
            node("t", "llm"), node("f", "llm"), node("end", "end"));
        connect(d, "start", "condition", "end");
        JSONArray edges = d.getJSONArray("edges");
        edges.set(new JSONObject().set("sourceNodeID", "condition")
            .set("sourcePortID", "if_match").set("targetNodeID", "t"));
        edges.set(new JSONObject().set("sourceNodeID", "condition")
            .set("sourcePortID", "else").set("targetNodeID", "f"));

        WorkflowLayoutEngine.applyLayout(d, true);

        assertNoOverlap(d);
        assertNonNegative(d);
        Map<String, long[]> pos = positions(d);
        assertThat(pos.get("t")[1]).as("两分支纵向错开").isNotEqualTo(pos.get("f")[1]);
    }

    @Test
    @DisplayName("确定性：同输入两次布局逐字节一致")
    void deterministic() {
        JSONObject d1 = doc(node("start", "start"), node("a", "llm"), node("b", "http"),
            node("c", "code"), node("end", "end"));
        connect(d1, "start", "a", "c", "end");
        connect(d1, "start", "b", "c");
        JSONObject d2 = new JSONObject(d1.toString());

        WorkflowLayoutEngine.applyLayout(d1, true);
        WorkflowLayoutEngine.applyLayout(d2, true);

        assertThat(d1.toString()).isEqualTo(d2.toString());
    }

    @Test
    @DisplayName("run 结束重排幂等：已整理的图再跑坐标不动（防跳动）")
    void relayoutIsStable() {
        JSONObject d = doc(node("start", "start"), node("a", "llm"), node("b", "http"),
            node("end", "end"));
        connect(d, "start", "a", "end");
        connect(d, "start", "b", "end");
        WorkflowLayoutEngine.applyLayout(d, true);
        Map<String, long[]> first = positions(d);

        WorkflowLayoutEngine.applyLayout(d, true);
        Map<String, long[]> second = positions(d);

        assertThat(first).as("节点集合一致").containsOnlyKeys(second.keySet());
        first.forEach((id, p) -> assertThat(second.get(id))
            .as("第二次布局不得移动节点 %s", id)
            .containsExactly(p[0], p[1]));
    }

    @Test
    @DisplayName("force=false 只补缺失坐标，已有坐标视为用户布局不动")
    void missingOnlyKeepsUserPositions() {
        JSONObject d = doc(nodeAt("start", "start", 5000, 5000),
            nodeAt("a", "llm", 5600, 5000), node("b", "http"), node("end", "end"));
        connect(d, "start", "a", "end");
        connect(d, "start", "b", "end");

        WorkflowLayoutEngine.applyLayout(d, false);

        Map<String, long[]> pos = positions(d);
        assertThat(pos.get("start")).as("用户摆过的节点坐标保持").containsExactly(5000L, 5000L);
        assertThat(pos.get("a")).as("用户摆过的节点坐标保持").containsExactly(5600L, 5000L);
        assertThat(pos.get("b")).as("缺失坐标被补上").isNotNull();
        assertThat(pos.get("end")).as("缺失坐标被补上").isNotNull();

        WorkflowLayoutEngine.applyLayout(d, true);
        Map<String, long[]> forced = positions(d);
        assertThat(forced.get("start")[0]).as("force=true 全量重排覆盖用户坐标").isNotEqualTo(5000L);
    }

    @Test
    @DisplayName("一字长蛇阵重排为紧凑分层（宽高比收敛）")
    void snakeCompactsToLayers() {
        JSONArray nodeArr = new JSONArray();
        JSONArray edgeArr = new JSONArray();
        String prev = null;
        for (int i = 0; i < 6; i++) {
            String id = "n" + i;
            nodeArr.set(nodeAt(id, i == 0 ? "start" : (i == 5 ? "end" : "code"), 137 + i * 999, 431));
            if (prev != null) {
                edgeArr.set(edge(prev, id));
            }
            prev = id;
        }
        JSONObject d = new JSONObject().set("nodes", nodeArr).set("edges", edgeArr);

        WorkflowLayoutEngine.applyLayout(d, true);

        assertNoOverlap(d);
        assertNonNegative(d);
        Map<String, long[]> pos = positions(d);
        long width = pos.get("n5")[0] - pos.get("n0")[0];
        long height = Math.abs(pos.get("n5")[1] - pos.get("n0")[1]);
        assertThat(height).as("链式图纵向应收敛（旧一字长蛇在 320 步长下已超宽）").isLessThanOrEqualTo(width);
        assertThat(width).as("6 节点链宽不超过 6 层上限（360+160 间距 ×6）").isLessThan(6L * 520);
        for (int i = 0; i < 5; i++) {
            long gap = pos.get("n" + (i + 1))[0] - pos.get("n" + i)[0] - 360;
            assertThat(gap)
                .as("相邻层列间距不得小于 100（层间 between-layers 间距必须生效，回归钉子：首版漏设该选项默认 20px 列贴列）")
                .isGreaterThanOrEqualTo(100);
        }
    }

    @Test
    @DisplayName("环不致死且有解（ELK 破环）")
    void cycleTerminates() {
        JSONObject d = doc(node("a", "llm"), node("b", "http"), node("c", "code"));
        connect(d, "a", "b", "c", "a");

        WorkflowLayoutEngine.applyLayout(d, true);

        assertNoOverlap(d);
        assertNonNegative(d);
    }

    @Test
    @DisplayName("孤立无环节点（无可通行边）也有坐标")
    void isolatedNodesPlaced() {
        JSONObject d = doc(node("x", "llm"), node("y", "http"));

        WorkflowLayoutEngine.applyLayout(d, true);

        assertNoOverlap(d);
        assertNonNegative(d);
    }

    @Test
    @DisplayName("canonicalize 缺坐标兜底：全部节点落位 + 修补说明")
    void canonicalizerMissingPositionPath() {
        JSONObject d = doc(node("start", "start"), node("llm_1", "llm"), node("end", "end"));
        connect(d, "start", "llm_1", "end");

        // 直接走 layoutNodeList（canonicalize 内联路径同参同语义）
        List<JSONObject> nodeList = new java.util.ArrayList<>();
        for (Object o : d.getJSONArray("nodes")) {
            nodeList.add((JSONObject) o);
        }
        List<JSONObject> edgeList = new java.util.ArrayList<>();
        for (Object o : d.getJSONArray("edges")) {
            edgeList.add((JSONObject) o);
        }
        WorkflowLayoutEngine.layoutNodeList(nodeList, edgeList, false);

        assertNoOverlap(d);
        assertNonNegative(d);
    }

    @Test
    @DisplayName("尺寸表：未知类型有兜底尺寸，关键类型已登记")
    void sizeTableCoversKeyTypes() {
        for (String type : new String[]{"start", "end", "llm", "http", "code", "condition",
            "branches", "loop", "workflow", "string-format", "variable"}) {
            assertThat(WorkflowLayoutEngine.NODE_SIZES).containsKey(type);
        }
        Set<String> widths = new HashSet<>();
        WorkflowLayoutEngine.NODE_SIZES.values().forEach(s -> widths.add(s[0] + "x" + s[1]));
        assertThat(widths).as("尺寸表不应只有单一尺寸（否则是抄了旧固定步长）").size().isGreaterThan(3);
    }
}
