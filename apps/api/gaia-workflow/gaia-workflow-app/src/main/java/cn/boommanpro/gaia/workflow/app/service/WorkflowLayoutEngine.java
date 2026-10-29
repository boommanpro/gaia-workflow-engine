package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider;
import org.eclipse.elk.alg.layered.options.LayeredOptions;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.Direction;
import org.eclipse.elk.core.options.PortConstraints;
import org.eclipse.elk.core.options.PortSide;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.graph.ElkEdge;
import org.eclipse.elk.graph.ElkGraphFactory;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.ElkPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * 服务端自动布局引擎 —— ELK layered（完整 Sugiyama 五阶段：破环、分层、交叉最小化、坐标对齐、边路由）。
 *
 * <p>2026-10-29 布局收口（方案 A，用户确认）：旧 BFS 分层（X_STEP=320/Y_STEP=200、层内按插入顺序
 * 堆叠、碰撞盒 240×120）与画布真实节点尺寸（宽 360、llm/http/code 高 390）严重失配，同列两节点
 * 垂直重叠 190px、相邻列水平重叠 40px，「打开就一坨」由此而来。ELK 按真实尺寸布局并支持
 * 端口约束，质量对标 Langflow（elkjs）一档。</p>
 *
 * <p>确定性：节点按 id 排序建图、固定随机种子 —— 同输入必产出同坐标，run 结束重排不会让已
 * 整理的图跳动。异常时回退内置简单分层，布局永不阻断落版/草稿链路。</p>
 *
 * <p>坐标语义：ELK 输出即 top-left，与 FlowGram {@code meta.position} 同语义，直接写回；
 * 整体平移到画布边距原点。调用方：{@link WorkflowDslCanonicalizer}（缺坐标兜底/落版）、
 * {@code SessionWorkflowDraftService}（run 结束 autoLayoutIfUntouched、agent autoLayout 工具）。</p>
 */
public final class WorkflowLayoutEngine {

    private static final Logger log = LoggerFactory.getLogger(WorkflowLayoutEngine.class);

    /** 画布边距原点（与前端历史 ORIGIN≈(80,120) 同视觉习惯） */
    private static final int MARGIN_X = 80;
    private static final int MARGIN_Y = 80;
    /** 同层节点纵向间距 / 相邻层横向间距（对齐前端 dagre 整理的 nodesep/ranksep=100 观感）。
     *  注意相邻层间距是 layered 独立选项（默认仅 20px——首版只设了 SPACING_NODE_NODE，
     *  列与列几乎贴死，2026-10-29 用户验收反馈修正）；层间长边走廊同扩，避免连线贴节点边。 */
    private static final double SPACING_NODE_NODE = 120;
    private static final double SPACING_NODE_NODE_BETWEEN_LAYERS = 120;
    private static final double SPACING_EDGE_NODE = 100;
    private static final double SPACING_EDGE_NODE_BETWEEN_LAYERS = 80;

    /**
     * 节点尺寸表（宽, 高）：布局用的只读镜像，唯一事实源是
     * apps/console/src/nodes/&lt;type&gt;/index.ts 注册表的 size 字段（NC-01：画布生命周期归前端）。
     * 防漂移守卫：{@code WorkflowLayoutEngineNodeSizeContractTest} 直接解析 TS 源码断言本表一致，
     * 前端改尺寸而不同步本表会测试失败。
     */
    static final Map<String, int[]> NODE_SIZES = new TreeMap<>(Map.ofEntries(
        Map.entry("start", new int[]{360, 211}),
        Map.entry("end", new int[]{360, 211}),
        Map.entry("llm", new int[]{360, 390}),
        Map.entry("http", new int[]{360, 390}),
        Map.entry("code", new int[]{360, 390}),
        Map.entry("variable", new int[]{360, 390}),
        Map.entry("string-format", new int[]{360, 390}),
        Map.entry("condition", new int[]{360, 210}),
        Map.entry("branches", new int[]{360, 210}),
        Map.entry("workflow", new int[]{360, 280}),
        Map.entry("loop", new int[]{424, 244}),
        Map.entry("break", new int[]{360, 54}),
        Map.entry("continue", new int[]{360, 54}),
        Map.entry("block-start", new int[]{100, 100}),
        Map.entry("block-end", new int[]{100, 100}),
        Map.entry("comment", new int[]{240, 150}),
        Map.entry("group", new int[]{560, 400})));
    /** 未知类型兜底：按最大常规节点算，宁可稀疏不可重叠 */
    private static final int[] DEFAULT_SIZE = {360, 390};

    private static volatile boolean elkRegistered = false;

    private WorkflowLayoutEngine() {
    }

    /**
     * 布局一份文档（nodes/edges 顶层图；loop 容器内 blocks 属渲染层生命周期，v1 不动）。
     *
     * @param force true=全量重排（run 结束整理 / agent autoLayout 工具）；
     *              false=只写入缺失坐标的节点，已有坐标视为用户布局不动（落版兜底既有语义）
     */
    public static void applyLayout(JSONObject doc, boolean force) {
        if (doc == null) {
            return;
        }
        JSONArray nodes = doc.getJSONArray("nodes");
        if (nodes == null || nodes.isEmpty()) {
            return;
        }
        List<JSONObject> nodeList = new ArrayList<>();
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject n = nodes.getJSONObject(i);
            if (n != null) {
                nodeList.add(n);
            }
        }
        JSONArray edges = doc.getJSONArray("edges");
        List<JSONObject> edgeList = new ArrayList<>();
        if (edges != null) {
            for (int i = 0; i < edges.size(); i++) {
                JSONObject e = edges.getJSONObject(i);
                if (e != null) {
                    edgeList.add(e);
                }
            }
        }
        layoutNodeList(nodeList, edgeList, force);
    }

    /**
     * 对节点/边列表布局（canonicalize 的缺坐标兜底路径用，文档尚未装配成 doc 形状）。
     */
    public static void layoutNodeList(List<JSONObject> nodes, List<JSONObject> edges, boolean force) {
        if (nodes == null || nodes.isEmpty()) {
            return;
        }
        Map<String, JSONObject> byId = new LinkedHashMap<>();
        for (JSONObject n : nodes) {
            byId.put(n.getStr("id"), n);
        }
        List<JSONObject> validEdges = new ArrayList<>();
        if (edges != null) {
            for (JSONObject e : edges) {
                if (byId.containsKey(e.getStr("sourceNodeID")) && byId.containsKey(e.getStr("targetNodeID"))
                    && !e.getStr("sourceNodeID").equals(e.getStr("targetNodeID"))) {
                    validEdges.add(e);
                }
            }
        }
        try {
            elkLayout(nodes, validEdges, byId, force);
        } catch (Throwable t) {
            log.warn("[layout] ELK 布局失败，回退内置分层：{}", t.toString());
            fallbackLayeredLayout(nodes, validEdges, byId, force);
        }
    }

    // ---------------- ELK layered ----------------

    private static void registerElk() {
        if (!elkRegistered) {
            synchronized (WorkflowLayoutEngine.class) {
                if (!elkRegistered) {
                    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
                    elkRegistered = true;
                }
            }
        }
    }

    private static void elkLayout(List<JSONObject> nodes, List<JSONObject> edges,
                                  Map<String, JSONObject> byId, boolean force) {
        registerElk();
        ElkGraphFactory f = ElkGraphFactory.eINSTANCE;

        ElkNode root = f.createElkNode();
        root.setProperty(CoreOptions.ALGORITHM, LayeredOptions.ALGORITHM_ID);
        root.setProperty(CoreOptions.DIRECTION, Direction.RIGHT);
        root.setProperty(CoreOptions.SPACING_NODE_NODE, SPACING_NODE_NODE);
        root.setProperty(LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS, SPACING_NODE_NODE_BETWEEN_LAYERS);
        root.setProperty(CoreOptions.SPACING_EDGE_NODE, SPACING_EDGE_NODE);
        root.setProperty(LayeredOptions.SPACING_EDGE_NODE_BETWEEN_LAYERS, SPACING_EDGE_NODE_BETWEEN_LAYERS);
        root.setProperty(LayeredOptions.RANDOM_SEED, 42);

        // 节点按 id 排序建图 —— 与 RANDOM_SEED 一起保证同输入同输出（确定性，防 run 结束重排跳动）
        List<JSONObject> sortedNodes = new ArrayList<>(nodes);
        sortedNodes.sort(Comparator.comparing(n -> n.getStr("id", "")));
        Map<String, ElkNode> elkById = new LinkedHashMap<>();
        Map<String, Map<String, ElkPort>> portsById = new HashMap<>();
        for (JSONObject n : sortedNodes) {
            String id = n.getStr("id");
            int[] size = sizeOf(n);
            ElkNode elkNode = f.createElkNode();
            elkNode.setIdentifier(id);
            elkNode.setWidth(size[0]);
            elkNode.setHeight(size[1]);
            root.getChildren().add(elkNode);
            elkById.put(id, elkNode);

            // 条件/分支节点：声明端口固定在右侧并按声明顺序排布，分支边不再乱缠
            Set<String> declaredPorts = WorkflowDslCanonicalizer.legalPortsOf(n);
            if (declaredPorts != null) {
                Map<String, ElkPort> portMap = new LinkedHashMap<>();
                int index = 0;
                for (String portName : declaredPorts) {
                    ElkPort port = f.createElkPort();
                    port.setIdentifier(id + "#" + portName);
                    port.setProperty(CoreOptions.PORT_SIDE, PortSide.EAST);
                    port.setProperty(CoreOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE);
                    port.setProperty(CoreOptions.PORT_INDEX, index++);
                    elkNode.getPorts().add(port);
                    portMap.put(portName, port);
                }
                portsById.put(id, portMap);
            }
        }

        List<JSONObject> sortedEdges = new ArrayList<>(edges);
        sortedEdges.sort(Comparator
            .comparing((JSONObject e) -> e.getStr("sourceNodeID", ""))
            .thenComparing(e -> e.getStr("sourcePortID", ""))
            .thenComparing(e -> e.getStr("targetNodeID", "")));
        for (JSONObject e : sortedEdges) {
            ElkEdge elkEdge = f.createElkEdge();
            Map<String, ElkPort> sourcePorts = portsById.get(e.getStr("sourceNodeID"));
            ElkPort sourcePort = sourcePorts != null && e.getStr("sourcePortID") != null
                ? sourcePorts.get(e.getStr("sourcePortID")) : null;
            elkEdge.getSources().add(sourcePort != null ? sourcePort : elkById.get(e.getStr("sourceNodeID")));
            elkEdge.getTargets().add(elkById.get(e.getStr("targetNodeID")));
            root.getContainedEdges().add(elkEdge);
        }

        new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());

        // 归一化到边距原点（ELK 可能带 padding 偏移；坐标为 top-left，与 meta.position 同语义）
        double minX = Double.MAX_VALUE;
        double minY = Double.MAX_VALUE;
        for (ElkNode elkNode : root.getChildren()) {
            minX = Math.min(minX, elkNode.getX());
            minY = Math.min(minY, elkNode.getY());
        }
        double shiftX = (minX == Double.MAX_VALUE ? 0 : minX) - MARGIN_X;
        double shiftY = (minY == Double.MAX_VALUE ? 0 : minY) - MARGIN_Y;
        for (JSONObject n : sortedNodes) {
            if (!force && hasPosition(n)) {
                continue;
            }
            ElkNode elkNode = elkById.get(n.getStr("id"));
            writePosition(n, Math.round(elkNode.getX() - shiftX), Math.round(elkNode.getY() - shiftY));
        }
    }

    /** ELK 不可用时的保底：与旧实现同语义的 BFS 分层（先修重叠死穴，不追求美观） */
    private static void fallbackLayeredLayout(List<JSONObject> nodes, List<JSONObject> edges,
                                              Map<String, JSONObject> byId, boolean force) {
        Map<String, Integer> indegree = new HashMap<>();
        Map<String, List<String>> outgoing = new HashMap<>();
        for (JSONObject n : nodes) {
            indegree.put(n.getStr("id"), 0);
            outgoing.put(n.getStr("id"), new ArrayList<>());
        }
        for (JSONObject e : edges) {
            outgoing.get(e.getStr("sourceNodeID")).add(e.getStr("targetNodeID"));
            indegree.merge(e.getStr("targetNodeID"), 1, Integer::sum);
        }
        Map<String, Integer> depth = new HashMap<>();
        Deque<String> queue = new LinkedList<>();
        for (JSONObject n : nodes) {
            String id = n.getStr("id");
            if ("start".equals(n.getStr("type")) || indegree.get(id) == 0) {
                depth.put(id, 0);
                queue.add(id);
            }
        }
        int guard = 0;
        while (!queue.isEmpty() && guard++ < nodes.size() * 8) {
            String current = queue.poll();
            for (String next : outgoing.get(current)) {
                if (!depth.containsKey(next) || depth.get(next) < depth.get(current) + 1) {
                    depth.put(next, depth.get(current) + 1);
                    queue.add(next);
                }
            }
        }
        Map<Integer, Integer> layerCursor = new HashMap<>();
        for (JSONObject n : nodes) {
            if (!force && hasPosition(n)) {
                continue;
            }
            int d = depth.getOrDefault(n.getStr("id"), 0);
            int row = layerCursor.merge(d, 1, Integer::sum) - 1;
            int[] size = sizeOf(n);
            writePosition(n, MARGIN_X + d * 520, MARGIN_Y + row * (size[1] + 80));
        }
    }

    // ---------------- 尺寸与坐标写入 ----------------

    private static int[] sizeOf(JSONObject node) {
        int[] size = NODE_SIZES.get(node.getStr("type"));
        return size != null ? size : DEFAULT_SIZE;
    }

    private static boolean hasPosition(JSONObject node) {
        JSONObject meta = node.getJSONObject("meta");
        return meta != null && meta.getJSONObject("position") != null;
    }

    private static void writePosition(JSONObject node, long x, long y) {
        JSONObject meta = node.getJSONObject("meta");
        if (meta == null) {
            meta = new JSONObject();
            node.set("meta", meta);
        }
        meta.set("position", new JSONObject().set("x", x).set("y", y));
    }
}
