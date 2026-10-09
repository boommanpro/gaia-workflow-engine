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

    /** 将草稿文档广播给所有订阅窗口（画布变更后调用） */
    public void emitDocument(AgentRunContext context, String sessionKey) {
        if (context == null || sessionKey == null) {
            return;
        }
        context.emit("document", new JSONObject().set("dsl", get(sessionKey)));
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
