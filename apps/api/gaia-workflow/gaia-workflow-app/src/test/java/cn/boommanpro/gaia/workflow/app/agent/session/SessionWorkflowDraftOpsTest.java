package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("SessionWorkflowDraftService：ops 批处理引擎（原子性 / $ref / CAS 元数据）")
class SessionWorkflowDraftOpsTest {

    private SessionWorkflowDraftService service;
    private SessionArtifactStore artifactStore;

    @BeforeEach
    void setUp() {
        artifactStore = mock(SessionArtifactStore.class);
        when(artifactStore.getLatest(anyString(), anyString())).thenReturn(null);
        // persistArtifact/upsert 内部异常吞掉即可（默认 mock 返回 null 不抛）
        service = new SessionWorkflowDraftService(artifactStore);
    }

    private static JSONObject ops(Object... opsJson) {
        JSONArray array = new JSONArray();
        for (Object o : opsJson) {
            array.add(JSONUtil.parseObj(String.valueOf(o)));
        }
        return new JSONObject().set("ops", array);
    }

    private static final String START_DOC = "{\"nodes\":["
        + "{\"id\":\"start_0\",\"type\":\"start\",\"meta\":{\"position\":{\"x\":180,\"y\":200}},"
        + "\"data\":{\"title\":\"开始\",\"outputs\":{\"type\":\"object\",\"properties\":{\"text\":{\"type\":\"string\"}}}}}"
        + "],\"edges\":[]}";

    @Test
    @DisplayName("绑定水化：bindFromVersion 记录 boundCode/baseRevision")
    void bindRecordsMeta() {
        service.bindFromVersion("s1", "wf_a", 7L, JSONUtil.parseObj(START_DOC));
        JSONObject meta = service.getMeta("s1");
        assertEquals("wf_a", meta.getStr("boundCode"));
        assertEquals(7L, meta.getLong("baseRevision"));
        assertEquals("wf_a", service.getBoundCode("s1"));
        assertEquals(7L, service.getBaseRevision("s1"));
        // 同一工作流重复绑定不重置；换工作流才重新水化
        assertFalse(service.bindFromVersion("s1", "wf_a", 8L, JSONUtil.parseObj("{}")));
        assertTrue(service.bindFromVersion("s1", "wf_b", 1L, JSONUtil.parseObj(START_DOC)));
        assertEquals("wf_b", service.getBoundCode("s1"));
    }

    @Test
    @DisplayName("批处理 + $ref：新增互连一次生效，summary 瘦身回执")
    void batchWithRefs() {
        service.bindFromVersion("s1", "wf_a", 3L, JSONUtil.parseObj(START_DOC));
        SessionWorkflowDraftService.OpsOutcome outcome = service.applyOps("s1",
            ops(
                "{\"op\":\"addNode\",\"ref\":\"llm1\",\"type\":\"llm\",\"title\":\"总结\",\"data\":{\"prompt\":\"总结：{{ start_0.text }}\"}}",
                "{\"op\":\"addNode\",\"ref\":\"end1\",\"type\":\"end\",\"data\":{\"inputsValues\":{\"result\":{\"type\":\"ref\",\"content\":[\"$llm1\",\"result\"]}}}}",
                "{\"op\":\"connect\",\"from\":\"start_0\",\"to\":\"$llm1\"}",
                "{\"op\":\"connect\",\"from\":\"$llm1\",\"to\":\"$end1\"}"
            ).getJSONArray("ops"));
        assertTrue(outcome.ok, String.valueOf(outcome.violations));
        JSONObject summary = outcome.summary;
        assertEquals(4, summary.getInt("applied"));
        assertEquals(3, summary.getJSONObject("nodes").getInt("total"));
        assertEquals(2, summary.getJSONObject("edges").getInt("total"));
        assertEquals(2, summary.getJSONObject("edges").getInt("added"));
        assertEquals("wf_a", summary.getStr("boundCode"));
        // end 节点里的 $ref 引用应在 data 中被解析为真实 id（ref 内容解析）
        JSONObject end = service.getNode("s1", "end_1") != null ? service.getNode("s1", "end_1")
            : service.getNode("s1", summary.getJSONObject("nodes").getJSONArray("added").getStr(1));
        assertNotNull(end);
        String endId = end.getStr("id");
        JSONArray added = summary.getJSONObject("nodes").getJSONArray("added");
        String llmId = added.getStr(0);
        assertTrue(llmId.startsWith("llm_"), llmId);
        // 连线确实从 start 连到了新 llm
        JSONObject doc = service.publicDoc("s1");
        boolean linked = false;
        for (int i = 0; i < doc.getJSONArray("edges").size(); i++) {
            JSONObject edge = doc.getJSONArray("edges").getJSONObject(i);
            if ("start_0".equals(edge.getStr("sourceNodeID")) && llmId.equals(edge.getStr("targetNodeID"))) {
                linked = true;
            }
        }
        assertTrue(linked, "start_0 → " + llmId + " 连线缺失");
    }

    @Test
    @DisplayName("原子性：任一 op 非法整批拒绝，草稿不变")
    void atomicRejection() {
        service.bindFromVersion("s1", "wf_a", 3L, JSONUtil.parseObj(START_DOC));
        JSONObject before = new JSONObject(service.get("s1").toString());

        SessionWorkflowDraftService.OpsOutcome outcome = service.applyOps("s1",
            ops(
                "{\"op\":\"addNode\",\"type\":\"http\",\"data\":{\"url\":\"https://x\"}}",
                "{\"op\":\"connect\",\"from\":\"start_0\",\"to\":\"不存在的节点\"}"
            ).getJSONArray("ops"));
        assertFalse(outcome.ok);
        assertEquals(1, outcome.violations.size());
        assertTrue(outcome.violations.get(0).getPath().startsWith("ops[1]"));
        // 第一个合法 op 也没有被应用（原子）
        assertEquals(before.toString(), service.get("s1").toString());
    }

    @Test
    @DisplayName("updateNode 深合并：只传变更字段，未传字段保留")
    void updateNodeDeepMerge() {
        service.bindFromVersion("s1", "wf_a", 3L, JSONUtil.parseObj(START_DOC));
        SessionWorkflowDraftService.OpsOutcome outcome = service.applyOps("s1",
            ops(
                "{\"op\":\"addNode\",\"type\":\"llm\",\"id\":\"llm_1\",\"data\":{\"prompt\":\"v1\",\"temperature\":0.3}}",
                "{\"op\":\"updateNode\",\"nodeId\":\"llm_1\",\"data\":{\"prompt\":\"v2\"}}"
            ).getJSONArray("ops"));
        assertTrue(outcome.ok, String.valueOf(outcome.violations));
        JSONObject node = service.getNode("s1", "llm_1");
        // prompt 更新，temperature 保留
        String data = node.getJSONObject("data").toString();
        assertTrue(data.contains("v2"), data);
        assertTrue(data.contains("0.3"), data);
        assertEquals(1, outcome.summary.getJSONObject("nodes").getInt("changed"));
    }

    @Test
    @DisplayName("deleteNode 级联删边")
    void deleteCascadesEdges() {
        service.bindFromVersion("s1", "wf_a", 3L, JSONUtil.parseObj(START_DOC));
        service.applyOps("s1", ops(
            "{\"op\":\"addNode\",\"type\":\"llm\",\"id\":\"llm_1\",\"data\":{\"prompt\":\"p\"}}",
            "{\"op\":\"connect\",\"from\":\"start_0\",\"to\":\"llm_1\"}"
        ).getJSONArray("ops"));
        assertEquals(1, service.publicDoc("s1").getJSONArray("edges").size());

        SessionWorkflowDraftService.OpsOutcome outcome = service.applyOps("s1",
            ops("{\"op\":\"deleteNode\",\"nodeId\":\"llm_1\"}").getJSONArray("ops"));
        assertTrue(outcome.ok);
        assertEquals(0, service.publicDoc("s1").getJSONArray("edges").size());
        assertEquals(1, outcome.summary.getJSONObject("edges").getInt("removed"));
    }

    @Test
    @DisplayName("不支持的节点类型给出可用类型清单")
    void unsupportedTypeGuided() {
        service.bindFromVersion("s1", "wf_a", 3L, JSONUtil.parseObj(START_DOC));
        SessionWorkflowDraftService.OpsOutcome outcome = service.applyOps("s1",
            ops("{\"op\":\"addNode\",\"type\":\"gpt4\"}").getJSONArray("ops"));
        assertFalse(outcome.ok);
        assertTrue(outcome.violations.get(0).getFix().contains("llm"));
    }

    @Test
    @DisplayName("声明式 delta（addNodes/addEdges/updateNodes）与 ops 等价")
    void declarativeDeltaEquivalent() {
        service.bindFromVersion("s1", "wf_a", 3L, JSONUtil.parseObj(START_DOC));
        JSONObject args = JSONUtil.parseObj(
            "{\"addNodes\":[{\"type\":\"http\",\"ref\":\"hook\",\"data\":{\"url\":\"https://x\"}}],"
            + "\"addEdges\":[{\"from\":\"start_0\",\"to\":\"$hook\"}],"
            + "\"updateNodes\":[{\"nodeId\":\"start_0\",\"data\":{\"title\":\"输入\"}}]}");
        cn.hutool.json.JSONArray ops = SessionWorkflowDraftService.opsFromDeclarative(args);
        SessionWorkflowDraftService.OpsOutcome outcome = service.applyOps("s1", ops);
        assertTrue(outcome.ok, String.valueOf(outcome.violations));
        assertEquals(3, outcome.summary.getInt("applied"));
        JSONObject doc = service.publicDoc("s1");
        assertEquals(2, doc.getJSONArray("nodes").size());
        assertEquals(1, doc.getJSONArray("edges").size());
    }

    @Test
    @DisplayName("ops addNode 缺 type 时从 ref 名推断（http_1→http）")
    void typeInferredFromRef() {
        service.bindFromVersion("s1", "wf_a", 3L, JSONUtil.parseObj(START_DOC));
        SessionWorkflowDraftService.OpsOutcome outcome = service.applyOps("s1",
            ops("{\"op\":\"addNode\",\"ref\":\"http_1\",\"data\":{\"url\":\"https://x\"}}").getJSONArray("ops"));
        assertTrue(outcome.ok, String.valueOf(outcome.violations));
        JSONObject doc = service.publicDoc("s1");
        boolean hasHttp = false;
        for (int i = 0; i < doc.getJSONArray("nodes").size(); i++) {
            if ("http".equals(doc.getJSONArray("nodes").getJSONObject(i).getStr("type"))) {
                hasHttp = true;
            }
        }
        assertTrue(hasHttp, "http 类型应从 ref 推断出来");
    }

    @Test
    @DisplayName("markApplied 更新 CAS 基准")
    void markAppliedUpdatesBase() {
        service.bindFromVersion("s1", "wf_a", 3L, JSONUtil.parseObj(START_DOC));
        service.markApplied("s1", "wf_a", 4L);
        assertEquals(4L, service.getBaseRevision("s1"));
    }

    @Test
    @DisplayName("空壳 updateNode 的 fix 附节点当前配置（弱模型自修复依据）")
    void emptyUpdateNodeFixCarriesCurrentData() {
        service.bindFromVersion("s1", "wf_a", 3L, JSONUtil.parseObj(START_DOC));
        SessionWorkflowDraftService.OpsOutcome outcome = service.applyOps("s1",
            ops("{\"op\":\"updateNode\",\"nodeId\":\"start_0\"}").getJSONArray("ops"));
        assertFalse(outcome.ok, "空壳 updateNode 必须被拒绝");
        assertEquals(1, outcome.violations.size());
        String fix = outcome.violations.get(0).getFix();
        // fix 里必须带节点的当前 data，模型抄下来改字段即可修复
        assertTrue(fix.contains("start_0"), "fix 应点名节点：" + fix);
        assertTrue(fix.contains("outputs"), "fix 应附节点当前配置：" + fix);
        assertTrue(fix.contains("updateNode"), "fix 应给可拷贝的目标形状：" + fix);
    }

    @Test
    @DisplayName("updateNode 只带 title 合法（title 或 data 其一即可）")
    void titleOnlyUpdateNodeIsValid() {
        service.bindFromVersion("s1", "wf_a", 3L, JSONUtil.parseObj(START_DOC));
        SessionWorkflowDraftService.OpsOutcome outcome = service.applyOps("s1",
            ops("{\"op\":\"updateNode\",\"nodeId\":\"start_0\",\"title\":\"输入节点\"}").getJSONArray("ops"));
        assertTrue(outcome.ok, String.valueOf(outcome.violations));
    }
}
