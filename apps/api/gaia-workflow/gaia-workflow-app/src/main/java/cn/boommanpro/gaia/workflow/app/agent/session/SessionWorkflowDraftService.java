package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.service.NodeDataNormalizer;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslCanonicalizer;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

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
    private final SessionWorkflowStore sessionWorkflowStore;

    public SessionWorkflowDraftService(SessionArtifactStore artifactStore, SessionWorkflowStore sessionWorkflowStore) {
        this.artifactStore = artifactStore;
        this.sessionWorkflowStore = sessionWorkflowStore;
    }

    // ---------------- 读取 ----------------

    /**
     * 获取或创建会话草稿（变更类单操作的入口）。
     * 与 {@link #get} 的区别：空草稿会放入 drafts 缓存——否则首个 node add 改的是
     * 孤儿空文档，改动静默丢失（2026-10-17 E2E 实证：首操作 node add 后 get canvas 仍为空）。
     */
    public JSONObject getOrCreate(String sessionKey) {
        JSONObject doc = get(sessionKey);
        if (doc.getJSONArray("nodes") == null) {
            doc = emptyDoc();
        }
        JSONObject existing = drafts.putIfAbsent(sessionKey, doc);
        return existing != null ? existing : doc;
    }

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
     * 把当前草稿持久化为 workflow 产物并广播 artifact 事件，同时镜像为会话工作流的 draft 版本。
     * 画布增量操作（node / edge 工具）每次变更后调用；草稿为空时跳过。
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
        sessionWorkflowStore.syncDraft(sessionKey, withoutMeta(doc));
    }

    /**
     * 会话当前工作的 workflow_code：绑定了正式工作流时是绑定码，否则是会话草稿码 draft_&lt;sessionKey&gt;。
     * 测试用例、跑用例、执行日志都以它为准。
     */
    public String codeFor(String sessionKey) {
        String bound = getBoundCode(sessionKey);
        return bound != null && !bound.isEmpty() ? bound : SessionWorkflowStore.sessionCode(sessionKey);
    }

    // ---------------- 画布操作（供 CanvasToolExecutor 调用） ----------------

    /** 添加节点，返回新增节点的 id */
    public JSONObject addNode(String sessionKey, JSONObject args) {
        String type = args.getStr("type");
        if (type == null || type.isEmpty()) {
            return err("type is required");
        }
        JSONObject doc = getOrCreate(sessionKey);
        JSONArray nodes = doc.getJSONArray("nodes");

        String id = args.getStr("id");
        if (id == null || id.isEmpty()) {
            AtomicInteger counter = idCounters.computeIfAbsent(sessionKey, k -> new AtomicInteger(0));
            id = type + "_" + counter.incrementAndGet();
        } else if (findNode(doc, id) != null) {
            return err("node id already exists: " + id);
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
        JSONObject doc = getOrCreate(sessionKey);
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
        JSONObject doc = getOrCreate(sessionKey);
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
        JSONObject doc = getOrCreate(sessionKey);
        JSONArray edges = doc.getJSONArray("edges");
        JSONObject edge = new JSONObject().set("sourceNodeID", from).set("targetNodeID", to);
        if (args.getStr("fromPort") != null) {
            edge.set("sourcePortID", args.getStr("fromPort"));
        }
        // 去重：同样的 from→to(+port) 不重复添加（端口不同是两条合法边，如 condition 双分支）
        String port = args.getStr("fromPort");
        for (int i = 0; i < edges.size(); i++) {
            JSONObject e = edges.getJSONObject(i);
            boolean sameEnds = from.equals(e.getStr("sourceNodeID")) && to.equals(e.getStr("targetNodeID"));
            boolean samePort = java.util.Objects.equals(port, e.getStr("sourcePortID"));
            if (sameEnds && samePort) {
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
        JSONObject doc = getOrCreate(sessionKey);
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

    /** 精确断开一条带端口的连线（edge remove 用；disconnect 是按端点的宽匹配） */
    public JSONObject disconnectEdge(String sessionKey, String from, String to, String fromPort) {
        JSONObject doc = getOrCreate(sessionKey);
        JSONArray edges = doc.getJSONArray("edges");
        boolean removed = false;
        for (int i = edges.size() - 1; i >= 0; i--) {
            JSONObject e = edges.getJSONObject(i);
            if (from.equals(e.getStr("sourceNodeID")) && to.equals(e.getStr("targetNodeID"))
                && java.util.Objects.equals(fromPort, e.getStr("sourcePortID"))) {
                edges.remove(i);
                removed = true;
                break;
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

    /** 去掉 _meta 的对外文档（document 事件 / run workflow 执行输入用） */
    public JSONObject publicDoc(String sessionKey) {
        return withoutMeta(get(sessionKey));
    }

    private static JSONObject withoutMeta(JSONObject doc) {
        if (!doc.containsKey(META_KEY)) {
            return doc;
        }
        JSONObject copy = new JSONObject(doc.toString());
        copy.remove(META_KEY);
        return copy;
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
     * 落版工具移除后靠它维持「草稿与对话/工作流的绑定 + 用户保存时的并发基准」）。
     */
    public void rebind(String sessionKey, String workflowCode, Long baseRevision) {
        JSONObject doc = get(sessionKey);
        doc.set(META_KEY, new JSONObject()
            .set("boundCode", workflowCode)
            .set("baseRevision", baseRevision != null ? baseRevision : 0L)
            .set("draftRevision", nextDraftRevision(doc)));
        drafts.put(sessionKey, doc);
    }

    private static final String META_KEY = "_meta";

    private static int nextDraftRevision(JSONObject doc) {
        JSONObject meta = doc.getJSONObject(META_KEY);
        return (meta != null ? meta.getInt("draftRevision", 0) : 0) + 1;
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
