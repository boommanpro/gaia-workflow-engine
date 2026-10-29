package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.service.NodeDataNormalizer;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslCanonicalizer;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
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
    private final ConcurrentMap<String, java.util.concurrent.atomic.AtomicInteger> idCounters = new ConcurrentHashMap<>();

    private final SessionArtifactStore artifactStore;
    private final SessionWorkflowStore sessionWorkflowStore;
    private final SessionEventBus eventBus;

    public SessionWorkflowDraftService(SessionArtifactStore artifactStore,
                                       SessionWorkflowStore sessionWorkflowStore,
                                       SessionEventBus eventBus) {
        this.artifactStore = artifactStore;
        this.sessionWorkflowStore = sessionWorkflowStore;
        this.eventBus = eventBus;
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
        touch(sessionKey, "system");
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

        // start/end 顶层唯一（与 WorkflowDslValidator 的 MULTI_START/MULTI_END 同口径）：写入当场拒绝，
        // 不等落版才暴露；回执指引模型改接已有节点而不是再堆一个
        if ("start".equals(type) || "end".equals(type)) {
            String existingId = findTopLevelIdByType(nodes, type);
            if (existingId != null) {
                return err("画布已有 " + type + " 节点「" + existingId + "」：工作流有且仅有一个 " + type + "。"
                    + ("end".equals(type)
                        ? "条件/分支的各路径请用 edge(action=connect) 汇合到它，输出字段用 node(action=update) 改它的 inputsValues"
                        : "入口只能有一个，请直接使用已有 start"));
            }
        }

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
        // loop：模型常把循环体 blocks/edges 写进 data（契约正确拒绝后模型仍不改写法）——
        // 搬运到节点级（引擎 LoopNodeParser 只从节点级解析），与 http 扁平吸收同一哲学
        relocateLoopContainerFields(node);
        if (args.get("parentId") != null) {
            node.set("parentId", args.get("parentId"));
        }
        // code 入参声明类型传播（2026-10-25 F2）：ref 指向上游已声明输出时拷贝类型，
        // 覆盖 inferDeclaredType 对 ref 一律 string 的占位（声明只影响表单展示）
        propagateInputTypesFor(doc, node);

        // 循环容器放置（2026-10-25 C09 实证：node 工具此前没有任何把节点写进 loop.blocks 的路径，
        // 模型只能反复顶层 add 同一个体节点直到堆出 20+ 垃圾节点）：
        // parentId 指向 loop 节点时，节点落入该 loop 的 blocks（缺骨架先补 block-start/block-end），
        // 首个体节点自动从 block-start 接线；文档形状与画布 toJSON 完全一致。
        if (args.get("parentId") != null) {
            String parentId = args.getStr("parentId");
            JSONObject parent = findNode(doc, parentId);
            if (parent == null) {
                return err("parentId not found: " + parentId);
            }
            if (!"loop".equals(parent.getStr("type"))) {
                return err("parentId 必须指向 loop 容器节点（当前 " + parent.getStr("type") + "）；"
                    + "非容器节点之间的接线用 edge(action=connect)");
            }
            JSONObject skeleton = ensureLoopSkeleton(parent);
            String blockStartId = skeleton.getStr("blockStartId");
            JSONArray blocks = parent.getJSONArray("blocks");
            // 容器内位置：跟在已有体节点后面，避免和骨架重叠
            position = new JSONObject().set("x", 192 + Math.max(0, blocks.size() - 2) * 160).set("y", 0);
            node.getJSONObject("meta").set("position", position);
            node.set("parentId", parentId);
            blocks.add(node);
            propagateInputTypesFor(doc, node);
            touch(sessionKey, "ai");
            JSONObject placed = new JSONObject()
                .set("success", true)
                .set("nodeId", id)
                .set("node", node)
                .set("container", parentId)
                .set("blockStartId", blockStartId)
                .set("blockEndId", skeleton.getStr("blockEndId"));
            // 首个体节点：自动 block-start → 新节点，减少模型一次接线负担
            boolean hasBodyEdge = false;
            JSONArray innerEdges = parent.getJSONArray("edges");
            if (innerEdges != null) {
                for (int i = 0; i < innerEdges.size(); i++) {
                    JSONObject e = innerEdges.getJSONObject(i);
                    if (blockStartId.equals(e.getStr("sourceNodeID"))
                        && !blockStartId.equals(e.getStr("targetNodeID"))) {
                        hasBodyEdge = true;
                        break;
                    }
                }
            }
            if (!hasBodyEdge) {
                parent.getJSONArray("edges").add(new JSONObject()
                    .set("sourceNodeID", blockStartId).set("targetNodeID", id));
                placed.set("autoConnected", blockStartId + "->" + id);
            }
            return placed;
        }

        nodes.add(node);
        touch(sessionKey, "ai");

        JSONObject result = new JSONObject()
            .set("success", true)
            .set("nodeId", id)
            .set("node", node);
        return result;
    }

    /**
     * 确保 loop 容器具备 block-start/block-end 骨架（blocks 与节点级 edges 都在 loop 节点上，
     * 与画布 toJSON 同形），返回两个骨架节点的 id。
     */
    private JSONObject ensureLoopSkeleton(JSONObject loopNode) {
        JSONArray blocks = loopNode.getJSONArray("blocks");
        if (blocks == null) {
            blocks = new JSONArray();
            loopNode.set("blocks", blocks);
        }
        JSONArray edges = loopNode.getJSONArray("edges");
        if (edges == null) {
            edges = new JSONArray();
            loopNode.set("edges", edges);
        }
        String loopId = loopNode.getStr("id");
        String blockStartId = null;
        String blockEndId = null;
        for (int i = 0; i < blocks.size(); i++) {
            JSONObject b = blocks.getJSONObject(i);
            if ("block-start".equals(b.getStr("type")) && blockStartId == null) {
                blockStartId = b.getStr("id");
            }
            if ("block-end".equals(b.getStr("type")) && blockEndId == null) {
                blockEndId = b.getStr("id");
            }
        }
        if (blockStartId == null) {
            blockStartId = loopId + "_block_start";
            blocks.add(new JSONObject()
                .set("id", blockStartId).set("type", "block-start").set("data", new JSONObject())
                .set("meta", new JSONObject().set("position", new JSONObject().set("x", 32).set("y", 0))));
        }
        if (blockEndId == null) {
            blockEndId = loopId + "_block_end";
            blocks.add(new JSONObject()
                .set("id", blockEndId).set("type", "block-end").set("data", new JSONObject())
                .set("meta", new JSONObject().set("position", new JSONObject().set("x", 352).set("y", 0))));
        }
        return new JSONObject().set("blockStartId", blockStartId).set("blockEndId", blockEndId);
    }

    /** 节点是否位于某个 loop 容器的 blocks 内，返回容器节点（不在任何容器内返回 null） */
    private JSONObject loopContainerOf(JSONObject doc, String nodeId) {
        JSONArray nodes = doc.getJSONArray("nodes");
        if (nodes == null) {
            return null;
        }
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject n = nodes.getJSONObject(i);
            if (!"loop".equals(n.getStr("type")) || n.getJSONArray("blocks") == null) {
                continue;
            }
            for (Object b : n.getJSONArray("blocks")) {
                if (b instanceof JSONObject && nodeId.equals(((JSONObject) b).getStr("id"))) {
                    return n;
                }
            }
        }
        return null;
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
        // loop：data 里的 blocks/edges 搬到节点级（引擎从节点级解析容器结构）
        relocateLoopContainerFields(node);
        // 容器迁移：update 携带 parentId（顶层或 data 内——模型两种写法都出现过）
        // 时把已存在的节点移入 loop 容器 blocks（2026-10-25 C09 实证吸收）
        String moveInto = args.getStr("parentId");
        if (moveInto == null) {
            moveInto = data.getStr("parentId");
            data.remove("parentId");
        }
        if (moveInto != null) {
            JSONObject moved = moveNodeIntoLoop(doc, node, moveInto);
            if (moved != null) {
                propagateInputTypesFor(doc, node);
                touch(sessionKey, "ai");
                return moved;
            }
        }
        propagateInputTypesFor(doc, node);
        touch(sessionKey, "ai");
        return new JSONObject().set("success", true);
    }

    /** 把顶层节点移入 loop 容器 blocks（骨架缺失自动补），返回迁移回执；目标不是 loop 时返回 null 走原路径 */
    private JSONObject moveNodeIntoLoop(JSONObject doc, JSONObject node, String loopId) {
        JSONObject parent = findNode(doc, loopId);
        if (parent == null || !"loop".equals(parent.getStr("type"))) {
            return null;
        }
        JSONObject skeleton = ensureLoopSkeleton(parent);
        // 从顶层 nodes 摘除
        JSONArray nodes = doc.getJSONArray("nodes");
        for (int i = nodes.size() - 1; i >= 0; i--) {
            if (node.getStr("id").equals(nodes.getJSONObject(i).getStr("id"))) {
                nodes.remove(i);
                break;
            }
        }
        node.set("parentId", loopId);
        parent.getJSONArray("blocks").add(node);
        return new JSONObject().set("success", true)
            .set("movedInto", loopId)
            .set("blockStartId", skeleton.getStr("blockStartId"))
            .set("blockEndId", skeleton.getStr("blockEndId"));
    }

    /**
     * loop 容器字段归位：模型经常把循环体 blocks/edges 写进 data（schema additionalProperties:false
     * 会拒绝，但模型屡教不改——2026-10-25 C09 三轮实证）。这里把 data.blocks/data.edges 搬到节点级：
     * blocks 按 id 去重追加（不覆盖画布已有的骨架与体节点），edges 整体替换。
     */
    private void relocateLoopContainerFields(JSONObject node) {
        if (!"loop".equals(node.getStr("type"))) {
            return;
        }
        JSONObject data = node.getJSONObject("data");
        if (data == null) {
            return;
        }
        Object blocks = data.remove("blocks");
        Object edges = data.remove("edges");
        if (blocks instanceof JSONArray) {
            JSONArray target = node.getJSONArray("blocks");
            if (target == null) {
                target = new JSONArray();
                node.set("blocks", target);
            }
            java.util.Set<String> existingIds = new java.util.HashSet<>();
            for (Object b : target) {
                if (b instanceof JSONObject) {
                    existingIds.add(((JSONObject) b).getStr("id"));
                }
            }
            for (Object b : (JSONArray) blocks) {
                if (b instanceof JSONObject) {
                    String bid = ((JSONObject) b).getStr("id");
                    if (bid == null || !existingIds.contains(bid)) {
                        target.add(b);
                        if (bid != null) {
                            existingIds.add(bid);
                        }
                    }
                }
            }
        }
        if (edges instanceof JSONArray) {
            node.set("edges", edges);
        }
    }

    /** code 入参类型传播的图上下文包装（见 NodeDataNormalizer.propagateInputTypes） */
    private void propagateInputTypesFor(JSONObject doc, JSONObject node) {
        NodeDataNormalizer.propagateInputTypes(node, id -> {
            JSONObject target = findNode(doc, id);
            return target != null ? target.getJSONObject("data") : null;
        });
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
        if (removed) {
            touch(sessionKey, "ai");
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
        // 模型会猜循环骨架 id（block_start_<loopId> / <loopId>_block_start 两种写法都出现过）——
        // 目标 loop 存在且骨架 id 未落画布时归一到真实骨架 id，避免模型反复猜错
        from = normalizeLoopSkeletonRef(doc, from);
        to = normalizeLoopSkeletonRef(doc, to);
        // 循环体内部连线：两端都在同一个 loop 的 blocks 内时写入 loop 节点级 edges（引擎从此解析）；
        // 只有一端在容器内 = 跨容器边界，明确拒绝（顶层边引擎不会进入容器内部）
        JSONObject fromLoop = loopContainerOf(doc, from);
        JSONObject toLoop = loopContainerOf(doc, to);
        if (fromLoop != null || toLoop != null) {
            if (fromLoop == null || toLoop == null || !fromLoop.getStr("id").equals(toLoop.getStr("id"))) {
                return err("循环体连线必须两端都在同一个 loop 容器内部："
                    + "用 node(action=add, parentId=\"" + (fromLoop != null ? fromLoop.getStr("id") : toLoop.getStr("id"))
                    + "\") 把节点放入容器后再互相连线；loop 与外部节点之间的连线才是顶层边");
            }
            return connectInsideLoop(sessionKey, fromLoop, from, to, args.getStr("fromPort"));
        }
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
        touch(sessionKey, "ai");
        return new JSONObject().set("success", true);
    }

    /** loop 骨架 id 归一：block_start_<loopId>/<loopId>_block_start/block_end 两种语序都映射到真实骨架 id；非骨架猜测原样返回 */
    private String normalizeLoopSkeletonRef(JSONObject doc, String nodeId) {
        if (nodeId == null || findNode(doc, nodeId) != null) {
            return nodeId;
        }
        String loopId = null;
        boolean start = false;
        if (nodeId.startsWith("block_start_")) {
            loopId = nodeId.substring("block_start_".length());
            start = true;
        } else if (nodeId.startsWith("block_end_")) {
            loopId = nodeId.substring("block_end_".length());
        } else if (nodeId.endsWith("_block_start")) {
            loopId = nodeId.substring(0, nodeId.length() - "_block_start".length());
            start = true;
        } else if (nodeId.endsWith("_block_end")) {
            loopId = nodeId.substring(0, nodeId.length() - "_block_end".length());
        }
        if (loopId == null || loopId.isEmpty()) {
            return nodeId;
        }
        JSONObject loop = findNode(doc, loopId);
        if (loop == null || !"loop".equals(loop.getStr("type"))) {
            return nodeId;
        }
        JSONObject skeleton = ensureLoopSkeleton(loop);
        return start ? skeleton.getStr("blockStartId") : skeleton.getStr("blockEndId");
    }

    /** loop 容器内部连线（写 loop 节点级 edges，与画布 toJSON 同形），带去重 */
    private JSONObject connectInsideLoop(String sessionKey, JSONObject loopNode, String from, String to, String fromPort) {
        JSONArray edges = loopNode.getJSONArray("edges");
        if (edges == null) {
            edges = new JSONArray();
            loopNode.set("edges", edges);
        }
        String port = fromPort;
        for (int i = 0; i < edges.size(); i++) {
            JSONObject e = edges.getJSONObject(i);
            boolean sameEnds = from.equals(e.getStr("sourceNodeID")) && to.equals(e.getStr("targetNodeID"));
            boolean samePort = java.util.Objects.equals(port, e.getStr("sourcePortID"));
            if (sameEnds && samePort) {
                return new JSONObject().set("success", true).set("alreadyExists", true);
            }
        }
        JSONObject edge = new JSONObject().set("sourceNodeID", from).set("targetNodeID", to);
        if (port != null) {
            edge.set("sourcePortID", port);
        }
        edges.add(edge);
        touch(sessionKey, "ai");
        return new JSONObject().set("success", true).set("innerEdge", true);
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
        if (removed) {
            touch(sessionKey, "ai");
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
        if (removed) {
            touch(sessionKey, "ai");
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
        WorkflowDslCanonicalizer.applyLayout(doc, true);
        touch(sessionKey, "ai");
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

    /**
     * 将草稿变更广播给所有订阅窗口（画布工具每次变更后调用）。
     *
     * <p>v3 协议：带 300ms 前沿+尾沿节流 —— 搭建高峰（批量 node add / 连续连线）不会
     * 每次变更都广播全量 DSL；广播内容为<b>增量 ops</b>（按节点/连线 id 的 upsert/remove），
     * 首次或对不上版本时发全量。前端按 {@code baseVersion} 校验后应用，
     * 版本落后则自行 GET /document 拉全量。</p>
     */
    public void emitDocument(AgentRunContext context, String sessionKey) {
        if (context == null || sessionKey == null) {
            return;
        }
        requestEmit(sessionKey, data -> context.emit("document", data));
    }

    /** 非运行期广播（push-draft / seed-draft 等直接走总线），同样走版本化与节流 */
    public void broadcastDocument(String sessionKey) {
        if (sessionKey == null) {
            return;
        }
        requestEmit(sessionKey, data -> eventBus.publish(sessionKey, "document", data));
    }

    /** 去掉 _meta 的对外文档（document 事件 / run workflow 执行输入用） */
    public JSONObject publicDoc(String sessionKey) {
        return withoutMeta(get(sessionKey));
    }

    /** 对外文档 + 当前广播版本（GET /document 用；返回副本，不污染草稿缓存） */
    public JSONObject publicDocWithVersion(String sessionKey) {
        JSONObject doc = new JSONObject(publicDoc(sessionKey).toString());
        doc.set("version", getBroadcastVersion(sessionKey));
        return doc;
    }

    /** 当前草稿已广播到的版本（从未广播 = 0；前端据此与 document 事件对齐） */
    public long getBroadcastVersion(String sessionKey) {
        DocEmitState st = emitStates.get(sessionKey);
        return st != null ? st.version : 0;
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

    /**
     * 前端画布草稿回推（阶段 1.1「统一草稿与保存内容」）：以用户眼前的画布为准
     * 整份覆盖会话草稿。这是「本地草稿 → 服务端草稿」方向缺失的半边链路 ——
     * 回滚后同步、编辑器提问前同步、保存前对齐都走这里，否则回滚后再保存落的
     * 仍是撤销前的服务端旧内容、AI 回答基于旧参数。
     *
     * <p>绑定语义：保留既有 _meta（绑定码 + CAS 基准）；调用方带 workflowCode
     * 且与当前绑定不同时重建绑定（baseRevision 由 controller 按该工作流当前值解析）。
     * 客户端 DSL 永不带 _meta，传入的 _meta 一律丢弃。</p>
     */
    public JSONObject push(String sessionKey, JSONObject dsl, String workflowCode, Long baseRevision) {
        if (sessionKey == null || dsl == null) {
            return err("sessionKey and dsl are required");
        }
        JSONArray nodes = dsl.getJSONArray("nodes");
        if (nodes == null || nodes.isEmpty()) {
            return err("dsl.nodes is empty");
        }
        JSONObject copy = normalizeDoc(dsl);
        copy.remove(META_KEY);

        JSONObject meta = getMeta(sessionKey);
        boolean rebound = false;
        // 变更分类（2026-10-25 用户定义的修订语义）：节点增删/属性修改 = 实质变更（revision+1）；
        // 仅坐标变化 = layout 变更（revision 不动，但记 layoutUserTouched——自动布局据此让位）
        JSONObject previous = drafts.get(sessionKey);
        boolean layoutOnly = previous != null && contentEqualsIgnorePositions(previous, copy);
        if (workflowCode != null && !workflowCode.isEmpty()
            && !workflowCode.equals(meta.getStr("boundCode"))) {
            meta = new JSONObject()
                .set("boundCode", workflowCode)
                .set("baseRevision", baseRevision != null ? baseRevision : 0L)
                .set("draftRevision", 1);
            rebound = true;
        } else if (!layoutOnly) {
            // 同一绑定内的回推 = 用户改了一版：修订号 +1（get target=canvas 可见）
            meta.set("draftRevision", meta.getInt("draftRevision", 0) + 1);
        }
        meta.set("lastEditedBy", "user").set("lastEditedAt", System.currentTimeMillis());
        if (previous != null && !positionsEqual(previous, copy)) {
            meta.set("layoutUserTouched", true);
        }
        if (!meta.isEmpty()) {
            copy.set(META_KEY, meta);
        }
        drafts.put(sessionKey, copy);
        persistArtifact(sessionKey, "stable", "画布同步 · " + nodes.size() + " 节点");
        log.info("[draft] {} pushed from client ({} nodes{}, bound={})", sessionKey, nodes.size(),
            rebound ? ", rebound" : "", getBoundCode(sessionKey));
        return new JSONObject()
            .set("success", true)
            .set("nodeCount", nodes.size())
            .set("draftRevision", getDraftRevision(sessionKey))
            .set("boundCode", getBoundCode(sessionKey))
            .set("baseRevision", getBaseRevision(sessionKey));
    }

    private static final String META_KEY = "_meta";


    /** 内容等价（忽略坐标）：节点（去 position/_meta）与边（排序后）逐一比较 */
    private static boolean contentEqualsIgnorePositions(JSONObject a, JSONObject b) {
        return fingerprintIgnoringPositions(a).equals(fingerprintIgnoringPositions(b));
    }

    /** 仅比较坐标是否一致（节点 id 集不同视为不一致） */
    private static boolean positionsEqual(JSONObject a, JSONObject b) {
        JSONArray na = a.getJSONArray("nodes");
        JSONArray nb = b.getJSONArray("nodes");
        if (na == null || nb == null || na.size() != nb.size()) {
            return false;
        }
        Map<String, JSONObject> byId = new HashMap<>();
        for (int i = 0; i < nb.size(); i++) {
            JSONObject n = nb.getJSONObject(i);
            byId.put(n.getStr("id"), n);
        }
        for (int i = 0; i < na.size(); i++) {
            JSONObject n = na.getJSONObject(i);
            JSONObject other = byId.get(n.getStr("id"));
            if (other == null) {
                return false;
            }
            if (!java.util.Objects.equals(positionKey(n), positionKey(other))) {
                return false;
            }
        }
        return true;
    }

    private static String positionKey(JSONObject node) {
        JSONObject meta = node.getJSONObject("meta");
        JSONObject pos = meta != null ? meta.getJSONObject("position") : null;
        return pos == null ? "" : pos.getInt("x", 0) + "," + pos.getInt("y", 0);
    }

    private static String fingerprintIgnoringPositions(JSONObject doc) {
        JSONArray nodes = doc.getJSONArray("nodes");
        java.util.List<String> parts = new java.util.ArrayList<>();
        if (nodes != null) {
            for (int i = 0; i < nodes.size(); i++) {
                JSONObject copy = new JSONObject(nodes.getJSONObject(i).toString());
                JSONObject meta = copy.getJSONObject("meta");
                if (meta != null) {
                    meta.remove("position");
                }
                copy.remove(META_KEY);
                parts.add(copy.toString());
            }
        }
        parts.sort(null);
        JSONArray edges = doc.getJSONArray("edges");
        java.util.List<String> edgeParts = new java.util.ArrayList<>();
        if (edges != null) {
            for (int i = 0; i < edges.size(); i++) {
                edgeParts.add(edges.getJSONObject(i).toString());
            }
        }
        edgeParts.sort(null);
        return String.join("|", parts) + "||" + String.join("|", edgeParts);
    }

    /**
     * AI 构建完成后的自动分层布局（2026-10-29 布局收口）：
     * agent 的 node 工具无 position，增量落点在搭建期只保证不重叠，run 结束统一重排为
     * ELK layered 分层布局。门控：仅对<b>用户从未手动摆过布局</b>（_meta.layoutUserTouched
     * 未置位）的草稿生效，摆过一次即永久让位。旧版「宽高比 ≥6 才重排」门槛已删——
     * WorkflowLayoutEngine 确定性保证同输入同坐标，已整理的图再跑不跳；此前宽扁乱图
     * （比值 <6）永远得不到整理，正是「打开一坨」的另一半成因。
     * 布局是展示层变更：不 bump draftRevision（与 push 的 layout-only 语义同口径）。
     *
     * @return true=本次实际执行了重排；false=被门控跳过（用户摆过 / 节点不足 / 无草稿）
     */
    public boolean autoLayoutIfUntouched(String sessionKey) {
        JSONObject doc = drafts.get(sessionKey);
        if (doc == null) {
            return false;
        }
        JSONObject meta = doc.getJSONObject(META_KEY);
        if (meta != null && meta.getBool("layoutUserTouched", false)) {
            return false;
        }
        JSONArray nodes = doc.getJSONArray("nodes");
        if (nodes == null || nodes.size() < 3) {
            return false;
        }
        WorkflowDslCanonicalizer.applyLayout(doc, true);
        persistArtifact(sessionKey, "stable", "自动分层布局 · " + nodes.size() + " 节点");
        broadcastDocument(sessionKey);
        log.info("[draft] {} auto-layout applied ({} nodes)", sessionKey, nodes.size());
        return true;
    }

    /**
     * 变更记账：草稿修订号 +1 并记录最后编辑者（get target=canvas 的版本信息来源，
     * 让模型能回答「当前是什么版本、谁刚改过」）。编辑者：user=用户手改/回推/回滚，
     * ai=画布工具写入，system=落版应用/骨架等系统动作。
     */
    private void touch(String sessionKey, String editor) {
        JSONObject doc = drafts.get(sessionKey);
        if (doc == null) {
            return;
        }
        JSONObject meta = doc.getJSONObject(META_KEY);
        if (meta == null) {
            meta = new JSONObject();
        }
        meta.set("draftRevision", meta.getInt("draftRevision", 0) + 1);
        meta.set("lastEditedBy", editor);
        meta.set("lastEditedAt", System.currentTimeMillis());
        doc.set(META_KEY, meta);
    }

    /** 当前草稿修订号（每次实质变更 +1；随 _meta 持久化，重启不丢） */
    public int getDraftRevision(String sessionKey) {
        return getMeta(sessionKey).getInt("draftRevision", 0);
    }

    /** 最后编辑者：user / ai / system（可空 = 从未记账的旧草稿） */
    public String getLastEditedBy(String sessionKey) {
        return getMeta(sessionKey).getStr("lastEditedBy");
    }

    /** 最后编辑时间（epoch 毫秒，可空） */
    public Long getLastEditedAt(String sessionKey) {
        return getMeta(sessionKey).getLong("lastEditedAt");
    }

    private static int nextDraftRevision(JSONObject doc) {
        JSONObject meta = doc.getJSONObject(META_KEY);
        return (meta != null ? meta.getInt("draftRevision", 0) : 0) + 1;
    }

    // ---------------- v3：版本化增量广播（document 事件节流 + ops diff） ----------------

    /** 距上次广播不足该间隔时的变更走尾沿合并（前沿立即发，搭建高峰不刷屏也不滞后） */
    private static final long DOC_EMIT_LEADING_MS = 300;

    /** 单线程调度器（低频：每会话至多一个挂起任务） */
    private static final java.util.concurrent.ScheduledExecutorService DOC_EMITTER =
        java.util.concurrent.Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "doc-emit");
            t.setDaemon(true);
            return t;
        });

    private interface DocEmitter {
        void emit(JSONObject data);
    }

    /** 每会话的广播状态：版本号 + 上次广播时的节点/连线指纹 */
    private static final class DocEmitState {
        long version = 0;
        long lastEmitAt = 0;
        java.util.concurrent.ScheduledFuture<?> pending;
        java.util.Map<String, String> nodeJsons;
        java.util.Map<String, String> edgeJsons;
        String extraJson = "";
    }

    private final ConcurrentMap<String, DocEmitState> emitStates = new ConcurrentHashMap<>();

    private void requestEmit(String sessionKey, DocEmitter emitter) {
        DocEmitState st = emitStates.computeIfAbsent(sessionKey, k -> new DocEmitState());
        synchronized (st) {
            long now = System.currentTimeMillis();
            if (st.pending == null && now - st.lastEmitAt >= DOC_EMIT_LEADING_MS) {
                st.lastEmitAt = now;
                doEmit(sessionKey, st, emitter);
                return;
            }
            if (st.pending != null) {
                st.pending.cancel(false);
            }
            st.pending = DOC_EMITTER.schedule(() -> {
                synchronized (st) {
                    st.pending = null;
                    st.lastEmitAt = System.currentTimeMillis();
                    doEmit(sessionKey, st, emitter);
                }
            }, DOC_EMIT_LEADING_MS, java.util.concurrent.TimeUnit.MILLISECONDS);
        }
    }

    /** 计算并发送本帧（全量或 ops）；与上次指纹一致则静默跳过 */
    private void doEmit(String sessionKey, DocEmitState st, DocEmitter emitter) {
        try {
            JSONObject doc = publicDoc(sessionKey);
            java.util.Map<String, String> curNodes = new java.util.LinkedHashMap<>();
            java.util.Map<String, String> curEdges = new java.util.LinkedHashMap<>();
            JSONArray nodes = doc.getJSONArray("nodes");
            if (nodes != null) {
                for (int i = 0; i < nodes.size(); i++) {
                    JSONObject node = nodes.getJSONObject(i);
                    if (node != null && node.getStr("id") != null) {
                        curNodes.put(node.getStr("id"), node.toString());
                    }
                }
            }
            JSONArray edges = doc.getJSONArray("edges");
            if (edges != null) {
                for (int i = 0; i < edges.size(); i++) {
                    JSONObject edge = edges.getJSONObject(i);
                    if (edge != null) {
                        curEdges.put(edgeKey(edge), edge.toString());
                    }
                }
            }
            // 顶层附加键（nodes/edges 之外）：变化即退化为全量广播
            JSONObject extra = new JSONObject();
            for (String key : doc.keySet()) {
                if (!"nodes".equals(key) && !"edges".equals(key)) {
                    extra.set(key, doc.get(key));
                }
            }
            String extraJson = extra.toString();

            JSONObject data = new JSONObject();
            if (st.nodeJsons == null || !st.extraJson.equals(extraJson)) {
                data.set("dsl", new JSONObject(doc.toString()));
            } else {
                JSONArray ops = diffOps(st, curNodes, curEdges);
                if (ops.isEmpty()) {
                    return; // 与上次广播完全一致：静默（回声/重复触发）
                }
                data.set("ops", ops).set("baseVersion", st.version);
            }
            st.version++;
            data.set("version", st.version);
            st.nodeJsons = curNodes;
            st.edgeJsons = curEdges;
            st.extraJson = extraJson;
            emitter.emit(data);
        } catch (Exception e) {
            // 并发快照失败等异常：作废指纹，下一帧自动退化为全量
            st.nodeJsons = null;
            log.debug("[draft] emit diff failed, fallback to full next time: {}", e.getMessage());
        }
    }

    /** 节点/连线指纹差 → 增量 ops（upsert/remove 语义，前端幂等应用） */
    private static JSONArray diffOps(DocEmitState st,
                                     java.util.Map<String, String> curNodes,
                                     java.util.Map<String, String> curEdges) {
        JSONArray ops = new JSONArray();
        for (java.util.Map.Entry<String, String> entry : curNodes.entrySet()) {
            String prev = st.nodeJsons.get(entry.getKey());
            if (prev == null || !prev.equals(entry.getValue())) {
                ops.add(new JSONObject().set("op", "node_set").set("node", cn.hutool.json.JSONUtil.parseObj(entry.getValue())));
            }
        }
        for (String id : st.nodeJsons.keySet()) {
            if (!curNodes.containsKey(id)) {
                ops.add(new JSONObject().set("op", "node_remove").set("id", id));
            }
        }
        for (java.util.Map.Entry<String, String> entry : curEdges.entrySet()) {
            String prev = st.edgeJsons.get(entry.getKey());
            if (prev == null || !prev.equals(entry.getValue())) {
                ops.add(new JSONObject().set("op", "edge_set").set("edge", cn.hutool.json.JSONUtil.parseObj(entry.getValue())));
            }
        }
        for (String key : st.edgeJsons.keySet()) {
            if (!curEdges.containsKey(key)) {
                ops.add(new JSONObject().set("op", "edge_remove").set("key", key));
            }
        }
        return ops;
    }

    /** 连线指纹键：from→to（带端口时附 #port；端口不同是两条合法边） */
    private static String edgeKey(JSONObject edge) {
        String from = edge.getStr("sourceNodeID", "");
        String to = edge.getStr("targetNodeID", "");
        String port = edge.getStr("sourcePortID");
        return port != null && !port.isEmpty() ? from + "->" + to + "#" + port : from + "->" + to;
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

    /** 顶层节点里第一个指定类型的 id（start/end 唯一性检查；loop 体内的 block-start/block-end 不在此列） */
    private static String findTopLevelIdByType(JSONArray nodes, String type) {
        if (nodes == null || type == null) {
            return null;
        }
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject node = nodes.getJSONObject(i);
            if (node != null && type.equals(node.getStr("type"))) {
                return node.getStr("id");
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
        // 清洗 JSONNull（历史草稿可能已被「null 值」毒化，Jackson 序列化会 500）
        stripNulls(copy);
        // 对象输出声明的引用驱动补全：code 声明 buyer:{type:object} 不写 properties 时，
        // 下游模板引用的子字段在前端变量树查不到（渲染 Unknown）。按全图引用补全声明。
        NodeDataNormalizer.completeObjectOutputDeclarations(copy);
        return copy;
    }

    /** 递归移除值为 null / JSONNull 的键（对 JSONObject 与 JSONArray 生效） */
    private static void stripNulls(Object node) {
        if (node instanceof JSONObject) {
            JSONObject obj = (JSONObject) node;
            for (String key : new java.util.ArrayList<>(obj.keySet())) {
                Object value = obj.get(key);
                if (value == null || value instanceof cn.hutool.json.JSONNull) {
                    obj.remove(key);
                } else {
                    stripNulls(value);
                }
            }
        } else if (node instanceof JSONArray) {
            JSONArray arr = (JSONArray) node;
            for (int i = 0; i < arr.size(); i++) {
                stripNulls(arr.get(i));
            }
        }
    }

    private static JSONObject emptyDoc() {
        return new JSONObject()
            .set("nodes", new JSONArray())
            .set("edges", new JSONArray());
    }

    private static JSONObject err(String message) {
        return new JSONObject().set("success", false).set("error", message);
    }

    /**
     * 深合并：目标对象上递归合并源对象的值，数组/标量直接覆盖。
     * null（含 JSONNull）= 删除该键 —— 这是模型「删除字段」的唯一途径；
     * 直接存 null 会让 Jackson 无法序列化（GET /document 500，2026-10-20 验收实证）。
     */
    private void deepMerge(JSONObject target, JSONObject source) {
        for (String key : source.keySet()) {
            Object value = source.get(key);
            if (value == null || value instanceof cn.hutool.json.JSONNull) {
                target.remove(key);
            } else if (value instanceof JSONObject && target.get(key) instanceof JSONObject) {
                deepMerge((JSONObject) target.get(key), (JSONObject) value);
            } else {
                target.set(key, value);
            }
        }
    }
}
