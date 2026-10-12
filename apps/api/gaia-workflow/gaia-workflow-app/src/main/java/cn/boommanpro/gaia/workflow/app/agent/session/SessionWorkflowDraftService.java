package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.service.NodeDataNormalizer;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslCanonicalizer;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 服务端画布文档 —— 「前端仅展示数据」的关键一环。
 *
 * <p>旧链路里工作流文档存在浏览器内存（workflowDocumentStore），AI 的画布工具
 * 必须靠前端画布实例执行，窗口一关状态就丢。这里把「每段会话的当前工作流草稿」
 * 放到后端：AI 的 addNode / connect / updateNode / runWorkflow 全部落在这份
 * 服务端文档上，变更通过 {@code document} 事件广播给所有订阅窗口渲染。</p>
 *
 * <p>文档形态与前端 WorkflowDocument 保持一致（{nodes, edges, globalVariable}），
 * 方便前端直接用 WorkflowDocument.fromJSON 还原渲染。</p>
 */
@Slf4j
@Component
public class SessionWorkflowDraftService {

    /** 每段会话的草稿文档 */
    private final ConcurrentMap<String, JSONObject> drafts = new ConcurrentHashMap<>();

    /** 节点 id 递增器（避免同会话内快速增删时 id 冲突） */
    private final ConcurrentMap<String, AtomicInteger> idCounters = new ConcurrentHashMap<>();

    private final SessionArtifactStore artifactStore;

    public SessionWorkflowDraftService(SessionArtifactStore artifactStore) {
        this.artifactStore = artifactStore;
    }

    // ---------------- 读取 ----------------

    /** 获取会话草稿文档（无则返回空文档）。缓存未命中时从产物表恢复（重启不丢草稿） */
    public JSONObject get(String sessionKey) {
        if (sessionKey == null) {
            return emptyDoc();
        }
        JSONObject cached = drafts.get(sessionKey);
        if (cached != null) {
            return cached;
        }
        cn.boommanpro.gaia.workflow.infra.manage.entity.AgentArtifact artifact =
            artifactStore.getLatest(sessionKey, SessionArtifactStore.TYPE_WORKFLOW);
        if (artifact != null && artifact.getPayload() != null) {
            try {
                JSONObject restored = normalizeDoc(cn.hutool.json.JSONUtil.parseObj(artifact.getPayload()));
                if (restored.getJSONArray("nodes") != null && !restored.getJSONArray("nodes").isEmpty()) {
                    drafts.put(sessionKey, restored);
                    log.info("[draft] {} restored from artifact (v{}, {} nodes)", sessionKey,
                        artifact.getVersion(), restored.getJSONArray("nodes").size());
                    return restored;
                }
            } catch (Exception e) {
                log.warn("[draft] restore from artifact failed: {} — {}", sessionKey, e.getMessage());
            }
        }
        return emptyDoc();
    }

    /**
     * 直接用整份 DSL 覆盖草稿（applyWorkflow 落版成功后调用，让产物立即可见）。
     * 同步落产物表（status=applied）并广播 artifact 事件。
     */
    public void replace(String sessionKey, JSONObject dsl) {
        replace(sessionKey, dsl, "applied", null);
    }

    /** 带产物状态的 replace：status 传 applied（落版）或 stable（普通覆盖） */
    public void replace(String sessionKey, JSONObject dsl, String status, String summary) {
        if (sessionKey == null || dsl == null) {
            return;
        }
        JSONObject copy = normalizeDoc(dsl);
        drafts.put(sessionKey, copy);
        log.info("[draft] {} replaced with {} nodes", sessionKey,
            copy.getJSONArray("nodes") != null ? copy.getJSONArray("nodes").size() : 0);
        persistArtifact(sessionKey, status, summary);
    }

    /**
     * 把当前草稿持久化为 workflow 产物并广播 artifact 事件。
     * 画布增量操作（canvas 工具）每次结构性变更后调用；草稿为空时跳过。
     */
    public void persistArtifact(String sessionKey, String status, String summary) {
        if (sessionKey == null) {
            return;
        }
        JSONObject doc = drafts.get(sessionKey);
        if (doc == null) {
            return;
        }
        JSONArray nodes = doc.getJSONArray("nodes");
        if (nodes == null || nodes.isEmpty()) {
            return;
        }
        JSONArray edges = doc.getJSONArray("edges");
        String resolvedSummary = summary != null ? summary
            : nodes.size() + " 节点 · " + (edges != null ? edges.size() : 0) + " 连线";
        artifactStore.upsertSessionScoped(sessionKey, null, SessionArtifactStore.TYPE_WORKFLOW,
            status != null ? status : "stable", "画布草稿", resolvedSummary, doc);
    }

    // ---------------- 画布操作（供 CanvasToolExecutor 调用） ----------------

    /** 添加节点，返回新增节点的 id */
    public JSONObject addNode(String sessionKey, JSONObject args) {
        String type = args.getStr("type");
        if (type == null || type.isEmpty()) {
            return err("type is required");
        }
        JSONObject doc = get(sessionKey);
        JSONArray nodes = doc.getJSONArray("nodes");

        String id = args.getStr("id");
        if (id == null || id.isEmpty()) {
            AtomicInteger counter = idCounters.computeIfAbsent(sessionKey, k -> new AtomicInteger(0));
            id = type + "_" + counter.incrementAndGet();
        }

        // data：以传入 data 为基础，标题双写到 data.title（画布读取位置）
        JSONObject data = args.getJSONObject("data");
        if (data == null) {
            data = new JSONObject();
        } else {
            data = new JSONObject(data.toString());
        }
        if (!data.containsKey("title") && args.getStr("title") != null) {
            data.set("title", args.getStr("title"));
        }
        // 扁平字段 → inputsValues，保证 canvas 增量配置的节点可直接执行
        NodeDataNormalizer.normalize(type, data);

        // 位置：afterNodeId 时顺延其右侧，否则默认逐层排布
        JSONObject position = args.getJSONObject("position");
        if (position == null && args.getJSONObject("meta") != null) {
            position = args.getJSONObject("meta").getJSONObject("position");
        }
        if (position == null) {
            position = positionAfter(nodes, args.getStr("afterNodeId"));
        }

        JSONObject node = new JSONObject()
            .set("id", id)
            .set("type", type)
            .set("data", data)
            .set("meta", new JSONObject().set("position", position));
        if (args.get("parentId") != null) {
            node.set("parentId", args.get("parentId"));
        }
        nodes.add(node);

        JSONObject result = new JSONObject()
            .set("success", true)
            .set("nodeId", id)
            .set("node", node);
        return result;
    }

    /** 更新节点 data（深合并，数组整体替换），返回是否实际变更 */
    public JSONObject updateNode(String sessionKey, JSONObject args) {
        String nodeId = args.getStr("nodeId");
        if (nodeId == null) {
            return err("nodeId is required");
        }
        JSONObject doc = get(sessionKey);
        JSONObject node = findNode(doc, nodeId);
        if (node == null) {
            return err("node not found: " + nodeId);
        }
        JSONObject data = node.getJSONObject("data");
        if (data == null) {
            data = new JSONObject();
            node.set("data", data);
        }
        JSONObject patch = args.getJSONObject("data");
        if (patch != null) {
            deepMerge(data, patch);
        }
        if (args.get("title") != null) {
            data.set("title", args.get("title"));
        }
        // 扁平字段 → inputsValues，保证 canvas 增量配置的节点可直接执行
        NodeDataNormalizer.normalize(node.getStr("type"), data);
        return new JSONObject().set("success", true);
    }

    /** 删除节点及其相关连线 */
    public JSONObject deleteNode(String sessionKey, String nodeId) {
        JSONObject doc = get(sessionKey);
        JSONArray nodes = doc.getJSONArray("nodes");
        JSONArray edges = doc.getJSONArray("edges");

        boolean removed = false;
        for (int i = nodes.size() - 1; i >= 0; i--) {
            if (nodeId.equals(nodes.getJSONObject(i).getStr("id"))) {
                nodes.remove(i);
                removed = true;
            }
        }
        for (int i = edges.size() - 1; i >= 0; i--) {
            JSONObject edge = edges.getJSONObject(i);
            if (nodeId.equals(edge.getStr("sourceNodeID"))
                || nodeId.equals(edge.getStr("targetNodeID"))) {
                edges.remove(i);
            }
        }
        return new JSONObject().set("success", removed);
    }

    /** 添加连线 */
    public JSONObject connect(String sessionKey, JSONObject args) {
        String from = args.getStr("from");
        String to = args.getStr("to");
        if (from == null || to == null) {
            return err("from and to are required");
        }
        JSONObject doc = get(sessionKey);
        JSONArray edges = doc.getJSONArray("edges");
        JSONObject edge = new JSONObject().set("sourceNodeID", from).set("targetNodeID", to);
        if (args.getStr("fromPort") != null) {
            edge.set("sourcePortID", args.getStr("fromPort"));
        }
        // 去重：同样的 from→to 不重复添加
        for (int i = 0; i < edges.size(); i++) {
            JSONObject e = edges.getJSONObject(i);
            if (from.equals(e.getStr("sourceNodeID")) && to.equals(e.getStr("targetNodeID"))) {
                return new JSONObject().set("success", true).set("alreadyExists", true);
            }
        }
        edges.add(edge);
        return new JSONObject().set("success", true);
    }

    /** 断开连线 */
    public JSONObject disconnect(String sessionKey, JSONObject args) {
        String from = args.getStr("from");
        String to = args.getStr("to");
        JSONObject doc = get(sessionKey);
        JSONArray edges = doc.getJSONArray("edges");
        boolean removed = false;
        for (int i = edges.size() - 1; i >= 0; i--) {
            JSONObject e = edges.getJSONObject(i);
            if ((from == null || from.equals(e.getStr("sourceNodeID")))
                && (to == null || to.equals(e.getStr("targetNodeID")))) {
                edges.remove(i);
                removed = true;
            }
        }
        return new JSONObject().set("success", removed);
    }

    /** 自动布局（清空坐标后按拓扑分层排布） */
    public JSONObject autoLayout(String sessionKey) {
        JSONObject doc = get(sessionKey);
        JSONArray nodes = doc.getJSONArray("nodes");
        if (nodes != null) {
            for (int i = 0; i < nodes.size(); i++) {
                JSONObject node = nodes.getJSONObject(i);
                JSONObject meta = node.getJSONObject("meta");
                if (meta == null) {
                    meta = new JSONObject();
                    node.set("meta", meta);
                }
                meta.remove("position");
            }
        }
        WorkflowDslCanonicalizer.applyLayout(doc);
        return new JSONObject().set("success", true);
    }

    /** 按 id 取节点 */
    public JSONObject getNode(String sessionKey, String nodeId) {
        return findNode(get(sessionKey), nodeId);
    }

    /** 可用变量（来自各节点 data.outputs） */
    public JSONArray availableVariables(String sessionKey) {
        JSONObject doc = get(sessionKey);
        JSONArray nodes = doc.getJSONArray("nodes");
        JSONArray result = new JSONArray();
        if (nodes == null) {
            return result;
        }
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject node = nodes.getJSONObject(i);
            JSONObject data = node.getJSONObject("data");
            if (data == null || !data.containsKey("outputs")) {
                continue;
            }
            JSONObject outputs = data.getJSONObject("outputs");
            JSONObject props = outputs != null ? outputs.getJSONObject("properties") : null;
            JSONArray fields = new JSONArray();
            if (props != null) {
                for (String name : props.keySet()) {
                    JSONObject prop = props.getJSONObject(name);
                    fields.add(new JSONObject()
                        .set("name", name)
                        .set("type", prop != null ? prop.getStr("type", "string") : "string"));
                }
            }
            result.add(new JSONObject()
                .set("nodeId", node.getStr("id"))
                .set("nodeTitle", data.getStr("title", node.getStr("type")))
                .set("nodeType", node.getStr("type"))
                .set("outputs", fields));
        }
        return result;
    }

    /** 将草稿文档广播给所有订阅窗口（画布变更后调用；_meta 服务端内部键不外发） */
    public void emitDocument(AgentRunContext context, String sessionKey) {
        if (context == null || sessionKey == null) {
            return;
        }
        context.emit("document", new JSONObject().set("dsl", publicDoc(sessionKey)));
    }

    /** 去掉 _meta 的对外文档（document 事件 / run_workflow 执行输入用） */
    public JSONObject publicDoc(String sessionKey) {
        JSONObject doc = get(sessionKey);
        if (doc.containsKey(META_KEY)) {
            doc = new JSONObject(doc.toString());
            doc.remove(META_KEY);
        }
        return doc;
    }

    // ---------------- v2：绑定元数据（CAS 基准） + 批处理 ops 引擎 ----------------

    /**
     * 会话草稿的绑定信息：草稿基于哪个工作流、落版时以哪个 revision 为 CAS 基准。
     * 存进文档 JSON 的 "_meta" 键，随 artifact 持久化（重启不丢）。
     */
    public JSONObject getMeta(String sessionKey) {
        JSONObject doc = get(sessionKey);
        JSONObject meta = doc.getJSONObject(META_KEY);
        return meta != null ? meta : new JSONObject();
    }

    /** 当前草稿绑定的工作流编码（null=自由草稿，从未绑定） */
    public String getBoundCode(String sessionKey) {
        return getMeta(sessionKey).getStr("boundCode");
    }

    /** 落版时应携带的 CAS 基准 revision（null=新建场景，无基准） */
    public Long getBaseRevision(String sessionKey) {
        return getMeta(sessionKey).getLong("baseRevision");
    }

    /**
     * 把草稿绑定到某个已有工作流：会话没有草稿、或绑的是别的工作流时，
     * 用传入的当前版本 DSL 重新水化草稿并记录 baseRevision。
     *
     * @return true 表示本次发生了水化（调用方应广播 document）
     */
    public boolean bindFromVersion(String sessionKey, String workflowCode, long revision, JSONObject dsl) {
        if (sessionKey == null || workflowCode == null || dsl == null) {
            return false;
        }
        JSONObject meta = getMeta(sessionKey);
        if (workflowCode.equals(meta.getStr("boundCode"))) {
            return false;
        }
        JSONObject hydrated = normalizeDoc(new JSONObject(dsl.toString()));
        hydrated.set(META_KEY, new JSONObject()
            .set("boundCode", workflowCode)
            .set("baseRevision", revision)
            .set("draftRevision", 1));
        drafts.put(sessionKey, hydrated);
        persistArtifact(sessionKey, "stable", "基于 " + workflowCode + " 的会话草稿");
        log.info("[draft] {} hydrated from {}@rev{}", sessionKey, workflowCode, revision);
        return true;
    }

    /** 落版成功后同步草稿元数据（绑定 + 新 CAS 基准） */
    public void markApplied(String sessionKey, String workflowCode, long newRevision) {
        JSONObject doc = get(sessionKey);
        doc.set(META_KEY, new JSONObject()
            .set("boundCode", workflowCode)
            .set("baseRevision", newRevision)
            .set("draftRevision", nextDraftRevision(doc)));
        drafts.put(sessionKey, doc);
    }

    /**
     * 整份替换草稿后恢复绑定与 CAS 基准（replace 会重置 meta —— 2026-10-11
     * write_workflow 去落版后靠它维持「草稿与对话/工作流的绑定 + 用户保存时的并发基准」）。
     */
    public void rebind(String sessionKey, String workflowCode, Long baseRevision) {
        JSONObject doc = get(sessionKey);
        doc.set(META_KEY, new JSONObject()
            .set("boundCode", workflowCode)
            .set("baseRevision", baseRevision != null ? baseRevision : 0L)
            .set("draftRevision", nextDraftRevision(doc)));
        drafts.put(sessionKey, doc);
    }

    /** 批处理结果：成功时带瘦身回执；全部 op 被跳过时带 violations，部分跳过时带 skipped */
    public static class OpsOutcome {
        public boolean ok;
        /** 全部 op 都没通过校验时的完整修复指引（outcome.ok=false 时有效） */
        public java.util.List<cn.boommanpro.gaia.workflow.app.agent.tool.ToolArgsValidator.Violation> violations;
        /** 部分应用时被跳过的 op（outcome.ok=true 时有效，含 path/issue/fix） */
        public java.util.List<cn.boommanpro.gaia.workflow.app.agent.tool.ToolArgsValidator.Violation> skipped;
        public JSONObject summary;
    }

    /**
     * 批处理（部分应用语义）：合法 op 立即生效，非法 op 逐项跳过并在回执记
     * skipped（path/issue/fix）—— 进度永远向前，模型只需重发被跳过的项。
     * 仅当全部 op 都没通过校验时才整批不生效（ok=false，violations 给完整指引）。
     *
     * <p>支持两种入参形状（实测模型对 nodes 数组长板、对 op 短板，两者等价接入）：
     * 除 ops 外还可传声明式 delta —— addNodes[{type,ref?,id?,title?,data?}] / removeNodes[nodeId] /
     * updateNodes[{nodeId,title?,data?}] / addEdges[{from,to,fromPort?}] / removeEdges[{from,to}]，
     * 由 {@link #normalizeOpsInput} 先翻译成 ops 再走同一套校验。</p>
     *
     * <p>op 语法：
     * {op:"addNode", ref?, type, id?, title?, data?, afterNodeId?, position?}
     * {op:"updateNode", nodeId, title?, data?}（data 深合并，只传变更字段）
     * {op:"deleteNode", nodeId}
     * {op:"connect", from, to, fromPort?}
     * {op:"disconnect", from?, to?}
     * {op:"autoLayout"}
     * 同批内可用 "$ref" 引用本批 addNode(ref=...) 的节点（服务端确定性解析，取代跨轮次 $0/$1）。
     * 容错：addNode 缺 type 时从 ref/id 前缀推断（http_1→http）；缺 data 补默认骨架 + warning。</p>
     */
    public OpsOutcome applyOps(String sessionKey, JSONArray ops) {
        OpsOutcome outcome = new OpsOutcome();
        ops = ops != null ? normalizeOpsInput(ops) : new JSONArray();
        if (ops.isEmpty()) {
            outcome.ok = false;
            outcome.violations = java.util.Collections.singletonList(
                new cn.boommanpro.gaia.workflow.app.agent.tool.ToolArgsValidator.Violation(
                    "ops", "ops 不能为空", "至少提供一个操作"));
            return outcome;
        }
        // 在深拷贝上先验证再应用：跳过的 op 不触碰真实草稿
        JSONObject doc = new JSONObject(get(sessionKey).toString());
        JSONArray nodes = doc.getJSONArray("nodes");
        JSONArray edges = doc.getJSONArray("edges");
        java.util.List<cn.boommanpro.gaia.workflow.app.agent.tool.ToolArgsValidator.Violation> skipped =
            new java.util.ArrayList<>();
        java.util.List<JSONObject> validOps = new java.util.ArrayList<>();
        java.util.List<String> warnings = new java.util.ArrayList<>();

        // 第一遍：解析 addNode 的 ref → 实际 id（id 缺省时分配语义化 id）
        java.util.Map<String, String> refToId = new java.util.HashMap<>();
        java.util.Set<String> usedIds = collectIds(nodes);
        for (int i = 0; i < ops.size(); i++) {
            JSONObject op = ops.getJSONObject(i);
            if (op == null || !"addNode".equals(op.getStr("op"))) {
                continue;
            }
            String ref = op.getStr("ref");
            String id = op.getStr("id");
            // 容错：缺 type 时从 ref/id 前缀推断（http_1→http、llm_2→llm）
            if (op.getStr("type") == null || op.getStr("type").isEmpty()) {
                String candidate = ref != null && !ref.isEmpty() ? ref : id;
                String inferred = inferTypeFromName(candidate);
                if (inferred != null) {
                    op.set("type", inferred);
                }
            }
            if (id == null || id.isEmpty()) {
                String type = op.getStr("type") != null ? op.getStr("type") : "node";
                id = uniqueNodeId(usedIds, type);
                op.set("id", id);
            }
            if (ref == null || ref.isEmpty()) {
                ref = id; // id 本身即可作为本批引用名
            }
            refToId.put(ref.startsWith("$") ? ref : "$" + ref, id);
        }

        // 逐 op 验证（在演进的副本上模拟：同批合法 addNode 的 id 立即可被后续 op 引用；
        // 被跳过的 op 不改变模拟状态 —— 它不会生效）
        JSONObject counters = new JSONObject()
            .set("added", new JSONArray()).set("removed", 0).set("changed", 0)
            .set("edgesAdded", 0).set("edgesRemoved", 0);
        java.util.Set<String> knownIds = collectIds(nodes);
        java.util.Set<String> knownEdges = collectEdgeKeys(edges);
        java.util.Set<String> skippedRefs = new java.util.HashSet<>();
        for (int i = 0; i < ops.size(); i++) {
            JSONObject op = ops.getJSONObject(i);
            String path = "ops[" + i + "]";
            String type = op != null ? op.getStr("op") : null;
            if (type == null || type.isEmpty()) {
                skipped.add(v(path, "缺少 op 类型（已跳过）", "op 取值：addNode/updateNode/deleteNode/connect/disconnect/autoLayout"));
                continue;
            }
            switch (type) {
                case "addNode": {
                    String nodeType = op.getStr("type");
                    String id = op.getStr("id");
                    if (nodeType == null || nodeType.isEmpty()) {
                        skipped.add(v(path + ".type", "addNode 缺少 type（已跳过；业务字段要直接放在 data 里，不要拆成后续 updateNode）",
                            "改成这种形状：{\"op\":\"addNode\",\"ref\":\"http_1\",\"type\":\"http\","
                                + "\"title\":\"推送\",\"data\":{\"method\":\"POST\",\"url\":\"https://...\"}}"));
                        skippedRefs.add(refKeyOf(op.getStr("ref"), id));
                        continue;
                    }
                    if (!WorkflowDslCanonicalizer.isSupportedType(nodeType)) {
                        skipped.add(v(path + ".type", "不支持的节点类型 " + nodeType + "（已跳过）",
                            "可用类型：" + String.join(",", sortedTypes())));
                        skippedRefs.add(refKeyOf(op.getStr("ref"), id));
                        continue;
                    }
                    if (id != null && knownIds.contains(id)) {
                        skipped.add(v(path + ".id", "节点 id 已存在：" + id + "（已跳过）", "换一个唯一 id，或省略 id 让系统分配"));
                        skippedRefs.add(refKeyOf(op.getStr("ref"), id));
                        continue;
                    }
                    if (op.get("data") == null) {
                        // 缺 data 的 addNode:一次成型地补最小默认 data 并以 warning 告知实际配置 ——
                        // 进度永远向前,模型按 warning 里贴出的 JSON 用 updateNode 增量修正即可
                        //（落版校验会拒绝空 url/prompt，空骨架节点过不了 save，不会带上生产）。
                        JSONObject healed = defaultNodeData(nodeType, op);
                        op.set("data", healed);
                        warnings.add("ops[" + i + "] addNode 未带 data，已自动补默认配置（节点 "
                            + (id != null ? id : op.getStr("ref")) + "）：" + healed.toString()
                            + "。要调整就用 updateNode 增量修改字段，不要重建节点");
                    }
                    String after = op.getStr("afterNodeId");
                    if (after != null && !knownIds.contains(after)) {
                        skipped.add(v(path + ".afterNodeId", "afterNodeId 不存在：" + after + "（已跳过）",
                            "用 read_workflow / read_node 核对节点 id"));
                        skippedRefs.add(refKeyOf(op.getStr("ref"), id));
                        continue;
                    }
                    if (id != null) {
                        knownIds.add(id); // 同批后续 op 可引用
                    }
                    validOps.add(op);
                    break;
                }
                case "updateNode": {
                    String nodeId = resolveNodeRef(op.getStr("nodeId"), refToId);
                    if (nodeId == null) {
                        skipped.add(v(path + ".nodeId", "updateNode 缺少 nodeId（已跳过）", "指定要更新的节点 id"));
                        continue;
                    }
                    if (!knownIds.contains(nodeId)) {
                        skipped.add(v(path + ".nodeId", "节点不存在：" + nodeId + "（已跳过；注意：本会话草稿里的节点，"
                            + "不是其它工作流的）" + refSkippedNote(op.getStr("nodeId"), skippedRefs),
                            "先 read_workflow 水化草稿或核对 id"));
                        continue;
                    }
                    if (op.get("data") == null && op.get("title") == null) {
                        // 空壳 updateNode 是无效操作但不毒死整批：跳过并在 skipped 里带当前配置，
                        // 模型抄下来改字段即可，不必再猜结构
                        skipped.add(v(path, "updateNode 没有给出要修改的内容（title 或 data 至少其一），已跳过——这一项没有生效，其余操作不受影响",
                            "节点 " + nodeId + " 当前配置：" + currentNodeDataJson(nodes, nodeId)
                                + "。要改字段就只传变更项，如 {\"op\":\"updateNode\",\"nodeId\":\"" + nodeId
                                + "\",\"data\":{...变更字段...}}；想新增节点请用 addNodes 并直接带完整 data"));
                        continue;
                    }
                    validOps.add(op);
                    break;
                }
                case "deleteNode": {
                    String nodeId = resolveNodeRef(op.getStr("nodeId"), refToId);
                    if (nodeId == null) {
                        skipped.add(v(path + ".nodeId", "deleteNode 缺少 nodeId（已跳过）", "指定要删除的节点 id"));
                        continue;
                    }
                    if (!knownIds.contains(nodeId)) {
                        skipped.add(v(path + ".nodeId", "节点不存在：" + nodeId + "（已跳过）" + refSkippedNote(op.getStr("nodeId"), skippedRefs), "核对节点 id"));
                        continue;
                    }
                    knownIds.remove(nodeId); // 同批后续 op 不能再引用已删节点
                    validOps.add(op);
                    break;
                }
                case "connect": {
                    String rawFrom = op.getStr("from");
                    String rawTo = op.getStr("to");
                    String from = resolveNodeRef(rawFrom, refToId);
                    String to = resolveNodeRef(rawTo, refToId);
                    if (from == null || to == null) {
                        skipped.add(v(path, "connect 需要 from 和 to（已跳过）", "源/目标节点 id，本批新节点可用 $ref"));
                        continue;
                    }
                    boolean bad = false;
                    if (!knownIds.contains(from)) {
                        skipped.add(v(path + ".from", "源节点不存在：" + from + "（已跳过）" + refSkippedNote(rawFrom, skippedRefs), "核对节点 id 或用 $ref"));
                        bad = true;
                    }
                    if (!knownIds.contains(to)) {
                        skipped.add(v(path + ".to", "目标节点不存在：" + to + "（已跳过）" + refSkippedNote(rawTo, skippedRefs), "核对节点 id 或用 $ref"));
                        bad = true;
                    }
                    if (bad) {
                        continue;
                    }
                    String key = from + "→" + to + (op.getStr("fromPort") != null ? "@" + op.getStr("fromPort") : "");
                    if (knownEdges.contains(key)) {
                        skipped.add(v(path, "连线已存在：" + from + "→" + to + "（已跳过）", "无需重复连接"));
                        continue;
                    }
                    knownEdges.add(key);
                    validOps.add(op);
                    break;
                }
                case "disconnect": {
                    if (op.getStr("from") == null && op.getStr("to") == null) {
                        skipped.add(v(path, "disconnect 需要 from 或 to 至少其一（已跳过）", "指定要断开的连线端点"));
                        continue;
                    }
                    validOps.add(op);
                    break;
                }
                case "autoLayout":
                    validOps.add(op);
                    break;
                default:
                    skipped.add(v(path, "未知 op 类型：" + type + "（已跳过）",
                        "op 取值：addNode/updateNode/deleteNode/connect/disconnect/autoLayout"));
            }
        }

        // 全部被跳过：没有任何 op 生效，按整批未通过处理（带完整修复指引）
        if (validOps.isEmpty()) {
            outcome.ok = false;
            outcome.violations = skipped;
            return outcome;
        }

        // 第二遍：合法 op 应用到副本
        for (JSONObject op : validOps) {
            switch (op.getStr("op")) {
                case "addNode": {
                    JSONObject node = buildNode(nodes, op);
                    nodes.add(node);
                    counters.getJSONArray("added").add(node.getStr("id"));
                    break;
                }
                case "updateNode": {
                    String nodeId = resolveNodeRef(op.getStr("nodeId"), refToId);
                    if (applyUpdate(nodes, nodeId, op)) {
                        counters.set("changed", counters.getInt("changed") + 1);
                    }
                    break;
                }
                case "deleteNode": {
                    String nodeId = resolveNodeRef(op.getStr("nodeId"), refToId);
                    int before = nodes.size();
                    for (int j = nodes.size() - 1; j >= 0; j--) {
                        if (nodeId.equals(nodes.getJSONObject(j).getStr("id"))) {
                            nodes.remove(j);
                        }
                    }
                    int edgesBefore = edges.size();
                    for (int j = edges.size() - 1; j >= 0; j--) {
                        JSONObject edge = edges.getJSONObject(j);
                        if (nodeId.equals(edge.getStr("sourceNodeID"))
                            || nodeId.equals(edge.getStr("targetNodeID"))) {
                            edges.remove(j);
                        }
                    }
                    if (nodes.size() < before) {
                        counters.set("removed", counters.getInt("removed") + 1);
                        counters.set("edgesRemoved", counters.getInt("edgesRemoved") + (edgesBefore - edges.size()));
                    }
                    break;
                }
                case "connect": {
                    String from = resolveNodeRef(op.getStr("from"), refToId);
                    String to = resolveNodeRef(op.getStr("to"), refToId);
                    JSONObject edge = new JSONObject().set("sourceNodeID", from).set("targetNodeID", to);
                    if (op.getStr("fromPort") != null) {
                        edge.set("sourcePortID", op.getStr("fromPort"));
                    }
                    edges.add(edge);
                    counters.set("edgesAdded", counters.getInt("edgesAdded") + 1);
                    break;
                }
                case "disconnect": {
                    String from = op.getStr("from") != null ? resolveNodeRef(op.getStr("from"), refToId) : null;
                    String to = op.getStr("to") != null ? resolveNodeRef(op.getStr("to"), refToId) : null;
                    int edgesBefore = edges.size();
                    for (int j = edges.size() - 1; j >= 0; j--) {
                        JSONObject edge = edges.getJSONObject(j);
                        if ((from == null || from.equals(edge.getStr("sourceNodeID")))
                            && (to == null || to.equals(edge.getStr("targetNodeID")))) {
                            edges.remove(j);
                        }
                    }
                    counters.set("edgesRemoved", counters.getInt("edgesRemoved") + (edgesBefore - edges.size()));
                    break;
                }
                case "autoLayout":
                    for (int j = 0; j < nodes.size(); j++) {
                        JSONObject meta = nodes.getJSONObject(j).getJSONObject("meta");
                        if (meta != null) {
                            meta.remove("position");
                        }
                    }
                    WorkflowDslCanonicalizer.applyLayout(doc);
                    break;
                default:
                    break;
            }
        }

        // 提交：替换真实草稿 + 草稿修订号 +1
        JSONObject meta = doc.getJSONObject(META_KEY);
        if (meta == null) {
            meta = new JSONObject();
            doc.set(META_KEY, meta);
        }
        meta.set("draftRevision", meta.getInt("draftRevision", 0) + 1);
        drafts.put(sessionKey, doc);
        persistArtifact(sessionKey, "stable", null);

        outcome.ok = true;
        outcome.skipped = skipped;
        JSONObject summary = new JSONObject()
            .set("applied", validOps.size())
            .set("warnings", warnings)
            .set("nodes", new JSONObject()
                .set("total", nodes.size())
                .set("added", counters.getJSONArray("added"))
                .set("removed", counters.getInt("removed"))
                .set("changed", counters.getInt("changed")))
            .set("edges", new JSONObject()
                .set("total", edges.size())
                .set("added", counters.getInt("edgesAdded"))
                .set("removed", counters.getInt("edgesRemoved")))
            .set("draftRevision", meta.getInt("draftRevision"))
            .set("boundCode", meta.getStr("boundCode"))
            .set("baseRevision", meta.getLong("baseRevision"));
        if (!skipped.isEmpty()) {
            JSONArray skippedJson = new JSONArray();
            for (cn.boommanpro.gaia.workflow.app.agent.tool.ToolArgsValidator.Violation s : skipped) {
                skippedJson.add(new JSONObject()
                    .set("path", s.getPath()).set("issue", s.getIssue()).set("fix", s.getFix()));
            }
            summary.set("skipped", skippedJson);
        }
        outcome.summary = summary;
        return outcome;
    }

    /** addNode 的 $ref 键（ref 缺省时用 id）—— 跳过时登记，供后续 op 的提示定位依赖失效 */
    private static String refKeyOf(String ref, String id) {
        String raw = ref != null && !ref.isEmpty() ? ref : id;
        return raw == null ? "" : (raw.startsWith("$") ? raw : "$" + raw);
    }

    /** 引用的 $ref 是否指向本批被跳过的 addNode —— 是则提示先修那项 */
    private static String refSkippedNote(String raw, java.util.Set<String> skippedRefs) {
        if (raw == null || !raw.startsWith("$") || skippedRefs.isEmpty()) {
            return "";
        }
        String key = raw.startsWith("$") ? raw : "$" + raw;
        return skippedRefs.contains(key) ? "。注意：它引用的本批 addNode(" + raw + ") 没有通过校验、未创建——先按 skipped 修复那项再接线" : "";
    }

    private static final String META_KEY = "_meta";

    /** 敏感键：模型可见文本（violations fix / read_node）中一律掩蔽，不进 LLM 上下文 */
    private static final java.util.Set<String> SENSITIVE_KEYS = java.util.Set.of(
        "apiKey", "apiHost", "api_key", "api_host", "token", "password", "authorization");

    /** 节点配置的模型可见副本：递归掩蔽敏感键（→ <平台配置，已隐藏>），不改动原对象 */
    public static JSONObject redactForModel(JSONObject data) {
        if (data == null) {
            return new JSONObject();
        }
        JSONObject copy = new JSONObject();
        for (String key : data.keySet()) {
            Object value = data.get(key);
            if (SENSITIVE_KEYS.contains(key)) {
                copy.set(key, "<平台配置，已隐藏>");
            } else if (value instanceof JSONObject) {
                copy.set(key, redactForModel((JSONObject) value));
            } else {
                copy.set(key, value);
            }
        }
        return copy;
    }

    /** 节点当前 data 的紧凑 JSON（空壳 updateNode 的 fix 用；敏感键掩蔽 + 超长截断防错误消息爆炸） */
    private static String currentNodeDataJson(JSONArray nodes, String nodeId) {
        if (nodes == null || nodeId == null) {
            return "{}";
        }
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject node = nodes.getJSONObject(i);
            if (node == null || !nodeId.equals(node.getStr("id"))) {
                continue;
            }
            JSONObject data = node.getJSONObject("data");
            if (data == null) {
                return "{}（该节点还没有任何配置）";
            }
            try {
                String json = cn.hutool.json.JSONUtil.toJsonStr(redactForModel(data));
                return json.length() > 800 ? json.substring(0, 800) + "…（完整结构用 read_node(\""
                    + nodeId + "\") 查看）" : json;
            } catch (Exception e) {
                return "{}";
            }
        }
        return "{}";
    }

    /** 声明式 delta → ops 翻译：addNodes/updateNodes/removeNodes/addEdges/removeEdges 等价于 ops */
    public static JSONArray opsFromDeclarative(JSONObject args) {
        JSONArray ops = new JSONArray();
        if (args == null) {
            return ops;
        }
        copyEach(ops, args.getJSONArray("addNodes"), item -> {
            JSONObject op = new JSONObject().set("op", "addNode");
            for (String key : new String[]{"ref", "type", "id", "title", "data", "afterNodeId", "position"}) {
                if (item.containsKey(key)) {
                    op.set(key, item.get(key));
                }
            }
            return op;
        });
        copyEach(ops, args.getJSONArray("updateNodes"), item -> {
            JSONObject op = new JSONObject().set("op", "updateNode")
                .set("nodeId", item.getStr("nodeId") != null ? item.getStr("nodeId") : item.getStr("id"));
            if (item.getStr("title") != null) {
                op.set("title", item.getStr("title"));
            }
            if (item.get("data") != null) {
                op.set("data", item.get("data"));
            }
            return op;
        });
        copyEach(ops, args.getJSONArray("removeNodes"), item ->
            new JSONObject().set("op", "deleteNode")
                .set("nodeId", item.getStr("nodeId") != null ? item.getStr("nodeId") : item.getStr("id")));
        copyEach(ops, args.getJSONArray("addEdges"), item -> {
            JSONObject op = new JSONObject().set("op", "connect")
                .set("from", item.getStr("from") != null ? item.getStr("from") : item.getStr("sourceNodeID"))
                .set("to", item.getStr("to") != null ? item.getStr("to") : item.getStr("targetNodeID"));
            if (item.getStr("fromPort") != null) {
                op.set("fromPort", item.getStr("fromPort"));
            }
            return op;
        });
        copyEach(ops, args.getJSONArray("removeEdges"), item ->
            new JSONObject().set("op", "disconnect")
                .set("from", item.getStr("from") != null ? item.getStr("from") : item.getStr("sourceNodeID"))
                .set("to", item.getStr("to") != null ? item.getStr("to") : item.getStr("targetNodeID")));
        return ops;
    }

    private interface OpTransform {
        JSONObject apply(JSONObject item);
    }

    private static void copyEach(JSONArray ops, JSONArray items, OpTransform transform) {
        if (items == null) {
            return;
        }
        for (int i = 0; i < items.size(); i++) {
            JSONObject item = items.getJSONObject(i);
            if (item != null) {
                JSONObject op = transform.apply(item);
                if (op != null) {
                    ops.add(op);
                }
            }
        }
    }

    /** 从 ref/id 名推断节点类型：http_1→http、llm_2→llm（尾部 _数字 去掉后命中受支持类型） */
    static String inferTypeFromName(String name) {
        if (name == null || name.isEmpty()) {
            return null;
        }
        String candidate = name.startsWith("$") ? name.substring(1) : name;
        candidate = candidate.replaceAll("_\\d+$", "");
        return WorkflowDslCanonicalizer.isSupportedType(candidate) ? candidate : null;
    }

    /** 入参归一（预留：目前 ops 原样返回，声明式翻译在 executor 层做） */
    static JSONArray normalizeOpsInput(JSONArray ops) {
        return ops;
    }

    private static int nextDraftRevision(JSONObject doc) {
        JSONObject meta = doc.getJSONObject(META_KEY);
        return (meta != null ? meta.getInt("draftRevision", 0) : 0) + 1;
    }

    private static java.util.Set<String> collectIds(JSONArray nodes) {
        java.util.Set<String> ids = new java.util.LinkedHashSet<>();
        for (int i = 0; i < nodes.size(); i++) {
            String id = nodes.getJSONObject(i).getStr("id");
            if (id != null) {
                ids.add(id);
            }
        }
        return ids;
    }

    /** 连线键集合（校验模拟用，与 WorkflowDiffService 的 edgeKey 同构） */
    private static java.util.Set<String> collectEdgeKeys(JSONArray edges) {
        java.util.Set<String> keys = new java.util.LinkedHashSet<>();
        for (int i = 0; i < edges.size(); i++) {
            JSONObject edge = edges.getJSONObject(i);
            String from = edge.getStr("sourceNodeID");
            String to = edge.getStr("targetNodeID");
            String port = edge.getStr("sourcePortID");
            keys.add(from + "→" + to + (port != null ? "@" + port : ""));
        }
        return keys;
    }

    private static String uniqueNodeId(java.util.Set<String> used, String type) {
        int n = used.size() + 1;
        String candidate;
        do {
            candidate = type + "_" + n++;
        } while (used.contains(candidate));
        used.add(candidate);
        return candidate;
    }

    /** "$ref" → 本批 addNode 分配的真实 id；普通值原样返回 */
    private static String resolveNodeRef(String raw, java.util.Map<String, String> refToId) {
        if (raw == null) {
            return null;
        }
        if (raw.startsWith("$")) {
            String resolved = refToId.get(raw);
            return resolved != null ? resolved : raw;
        }
        return raw;
    }

    private static boolean nodeExists(JSONArray nodes, String id) {
        for (int i = 0; i < nodes.size(); i++) {
            if (id.equals(nodes.getJSONObject(i).getStr("id"))) {
                return true;
            }
        }
        return false;
    }

    private static boolean edgeExists(JSONArray edges, String from, String to, String port) {
        for (int i = 0; i < edges.size(); i++) {
            JSONObject edge = edges.getJSONObject(i);
            boolean portMatch = (port == null && edge.getStr("sourcePortID") == null)
                || (port != null && port.equals(edge.getStr("sourcePortID")));
            if (from.equals(edge.getStr("sourceNodeID")) && to.equals(edge.getStr("targetNodeID")) && portMatch) {
                return true;
            }
        }
        return false;
    }

    private static java.util.List<String> sortedTypes() {
        java.util.List<String> types = new java.util.ArrayList<>(WorkflowDslCanonicalizer.supportedTypes());
        java.util.Collections.sort(types);
        return types;
    }

    private static cn.boommanpro.gaia.workflow.app.agent.tool.ToolArgsValidator.Violation v(
        String path, String issue, String fix) {
        return new cn.boommanpro.gaia.workflow.app.agent.tool.ToolArgsValidator.Violation(path, issue, fix);
    }

    /** 由 op 构建完整节点（与单节点 addNode 同语义：title 双写、扁平字段 normalize、默认坐标） */
    /**
     * addNode 缺 data 时的最小默认配置（一次成型 + 归一化）。
     * http/llm 运行期对 url/prompt 是硬依赖，补上扁平字段由 NodeDataNormalizer 包装；
     * 其余类型空结构即可被归一化器补齐骨架。
     */
    private static JSONObject defaultNodeData(String type, JSONObject op) {
        JSONObject data = new JSONObject();
        if (op.getStr("title") != null) {
            data.set("title", op.getStr("title"));
        }
        if ("http".equals(type)) {
            data.set("method", "GET").set("url", "");
        } else if ("llm".equals(type)) {
            data.set("prompt", "");
        }
        NodeDataNormalizer.normalize(type, data);
        return data;
    }

    private JSONObject buildNode(JSONArray nodes, JSONObject op) {        String type = op.getStr("type");
        String id = op.getStr("id") != null ? op.getStr("id")
            : uniqueNodeId(collectIds(nodes), type);
        JSONObject data = op.getJSONObject("data") != null
            ? new JSONObject(op.getJSONObject("data").toString()) : new JSONObject();
        if (!data.containsKey("title") && op.getStr("title") != null) {
            data.set("title", op.getStr("title"));
        }
        NodeDataNormalizer.normalize(type, data);
        JSONObject position = op.getJSONObject("position");
        if (position == null) {
            position = positionAfter(nodes, op.getStr("afterNodeId"));
        }
        JSONObject node = new JSONObject()
            .set("id", id)
            .set("type", type)
            .set("data", data)
            .set("meta", new JSONObject().set("position", position));
        if (op.get("parentId") != null) {
            node.set("parentId", op.get("parentId"));
        }
        return node;
    }

    /** 应用 updateNode（data 深合并 + title 双写 + normalize），返回是否实际变更 */
    private boolean applyUpdate(JSONArray nodes, String nodeId, JSONObject op) {
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject node = nodes.getJSONObject(i);
            if (!nodeId.equals(node.getStr("id"))) {
                continue;
            }
            JSONObject data = node.getJSONObject("data");
            if (data == null) {
                data = new JSONObject();
                node.set("data", data);
            }
            JSONObject patch = op.getJSONObject("data");
            if (patch != null) {
                // 显式 patch 必须赢：扁平键若已有 normalize 包装（inputsValues.key），
                // 先摘掉旧包装再合并，否则 moveTo* 的「已存在不覆盖」会静默丢弃新值
                dropWrappedKeys(data, patch);
                deepMerge(data, patch);
            }
            if (op.get("title") != null) {
                data.set("title", op.get("title"));
            }
            NodeDataNormalizer.normalize(node.getStr("type"), data);
            return true;
        }
        return false;
    }

    /** patch 的顶层扁平键若已在 data.inputsValues 里有包装，移除包装让新值重写 */
    private static void dropWrappedKeys(JSONObject data, JSONObject patch) {
        JSONObject iv = data.getJSONObject("inputsValues");
        if (iv == null) {
            return;
        }
        for (String key : patch.keySet()) {
            if (iv.containsKey(key) && !(patch.get(key) instanceof JSONObject && ((JSONObject) patch.get(key)).containsKey("type"))) {
                // patch 给的是扁平值（非 {type:...} 包装）→ 视为要覆盖
                iv.remove(key);
            }
        }
    }

    // ---------------- 内部 ----------------

    private JSONObject findNode(JSONObject doc, String nodeId) {
        if (doc == null || nodeId == null) {
            return null;
        }
        JSONArray nodes = doc.getJSONArray("nodes");
        if (nodes == null) {
            return null;
        }
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject node = nodes.getJSONObject(i);
            if (nodeId.equals(node.getStr("id"))) {
                return node;
            }
        }
        return null;
    }

    private JSONObject positionAfter(JSONArray nodes, String afterNodeId) {
        if (afterNodeId != null) {
            for (int i = nodes.size() - 1; i >= 0; i--) {
                JSONObject node = nodes.getJSONObject(i);
                if (afterNodeId.equals(node.getStr("id"))) {
                    JSONObject meta = node.getJSONObject("meta");
                    JSONObject pos = meta != null ? meta.getJSONObject("position") : null;
                    if (pos != null) {
                        return new JSONObject()
                            .set("x", pos.getInt("x", 0) + 300)
                            .set("y", pos.getInt("y", 0));
                    }
                }
            }
        }
        int base = 300 + nodes.size() * 40;
        return new JSONObject().set("x", base).set("y", 200);
    }

    private JSONObject normalizeDoc(JSONObject raw) {
        if (raw == null) {
            return emptyDoc();
        }
        JSONObject copy = new JSONObject(raw.toString());
        if (!copy.containsKey("nodes") || !(copy.get("nodes") instanceof JSONArray)) {
            copy.set("nodes", new JSONArray());
        }
        if (!copy.containsKey("edges") || !(copy.get("edges") instanceof JSONArray)) {
            copy.set("edges", new JSONArray());
        }
        return copy;
    }

    private static JSONObject emptyDoc() {
        return new JSONObject()
            .set("nodes", new JSONArray())
            .set("edges", new JSONArray());
    }

    private static JSONObject err(String message) {
        return new JSONObject().set("success", false).set("error", message);
    }

    /** 深合并：目标对象上递归合并源对象的值，数组/标量直接覆盖 */
    private void deepMerge(JSONObject target, JSONObject source) {
        for (String key : source.keySet()) {
            Object value = source.get(key);
            Object existing = target.get(key);
            if (value instanceof JSONObject && existing instanceof JSONObject) {
                deepMerge((JSONObject) existing, (JSONObject) value);
            } else {
                target.set(key, value);
            }
        }
    }
}
