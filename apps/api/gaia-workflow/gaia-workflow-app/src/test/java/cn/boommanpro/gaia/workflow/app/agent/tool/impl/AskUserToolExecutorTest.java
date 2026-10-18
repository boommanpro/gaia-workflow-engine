package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;
import cn.boommanpro.gaia.workflow.app.agent.session.AskUserPendingStore;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionEventBus;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("AskUserToolExecutor：options 归一化 + 挂起/作答/超时自动代答闭环")
class AskUserToolExecutorTest {

    /**
     * 记录调用的编排器桩：模拟 {@code AskUserFlowService} 的真实语义（先 store.resolve
     * 成功才算编排到）—— 若执行器在编排前把登记摘了（先 drop 后 startRound 的顺序 bug），
     * 这里会像真实链路一样返回 false，让测试抓住。
     */
    private static final class RecordingOrchestrator
            implements cn.boommanpro.gaia.workflow.app.agent.session.AskUserRoundOrchestrator {
        final List<String[]> calls = new ArrayList<>();
        private final AskUserPendingStore store;

        RecordingOrchestrator(AskUserPendingStore store) {
            this.store = store;
        }

        @Override
        public boolean startRound(String sessionKey, String askId, String answer, boolean auto, boolean awaitRunExit) {
            if (!store.resolve(sessionKey, askId, answer, auto)) {
                return false;
            }
            calls.add(new String[]{sessionKey, askId, answer, String.valueOf(auto)});
            return true;
        }
    }

    private static AgentRunContext context(String sessionKey, List<AgentEvent> events) {
        AgentRequest request = AgentRequest.of(sessionKey, "msg", "zh-CN", null);
        AgentRunContext ctx = new AgentRunContext(request, null, null);
        AgentEventSink sink = event -> events.add(event);
        ctx.setSink(sink);
        return ctx;
    }

    /** 等待 ask_request 事件出现（执行器在池线程里跑） */
    private static void awaitAskEvent(List<AgentEvent> events) throws InterruptedException {
        for (int i = 0; i < 100 && events.isEmpty(); i++) {
            Thread.sleep(30);
        }
        assertFalse(events.isEmpty(), "ask_request 未发出");
        assertEquals("ask_request", events.get(0).getType());
    }

    @Test
    @DisplayName("ask_request 事件的 options 归一化为 [{label, detail?, recommended?}]（对象/字符串/脏数据混合）")
    void emitsNormalizedOptions() throws Exception {
        SessionEventBus bus = new SessionEventBus();
        AskUserPendingStore store = new AskUserPendingStore(bus);
        RecordingOrchestrator orchestrator = new RecordingOrchestrator(store);
        AskUserToolExecutor executor = new AskUserToolExecutor(store, orchestrator);
        List<AgentEvent> events = new ArrayList<>();

        JSONArray options = new JSONArray();
        options.add(new JSONObject().set("label", "情感聊天").set("detail", "陪伴式回复").set("recommended", true));
        options.add("纯字符串选项");
        options.add(new JSONObject().set("detail", "没有 label 的脏数据"));
        options.add(new JSONObject().set("label", "  "));
        JSONObject args = new JSONObject()
            .set("question", "选哪种形态？")
            .set("options", options);

        ExecutorService pool = Executors.newSingleThreadExecutor();
        try {
            CompletableFuture<ToolResult> future = CompletableFuture.supplyAsync(
                () -> executor.execute(args, context("s1", events)), pool);
            awaitAskEvent(events);
            JSONObject payload = events.get(0).getData();
            assertEquals("选哪种形态？", payload.getStr("question"));
            JSONArray normalized = payload.getJSONArray("options");
            assertEquals(2, normalized.size());
            assertEquals("情感聊天", normalized.getJSONObject(0).getStr("label"));
            assertEquals("陪伴式回复", normalized.getJSONObject(0).getStr("detail"));
            assertEquals(true, normalized.getJSONObject(0).getBool("recommended"));
            assertNull(normalized.getJSONObject(1).getBool("recommended"));
            assertEquals("纯字符串选项", normalized.getJSONObject(1).getStr("label"));
            // 用户作答：唤醒工具返回答案（新轮编排由答案端点负责，执行器不触发）
            assertTrue(store.resolve("s1", payload.getStr("askId"), "就选情感聊天"));
            ToolResult result = future.get();
            assertTrue(result.isSuccess());
            assertTrue(result.getPayload().contains("就选情感聊天"));
            assertTrue(orchestrator.calls.isEmpty());
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    @DisplayName("跨会话作答被拒绝；同会话作答唤醒挂起工具并广播 ask_resolved")
    void resolveIsSessionScoped() throws Exception {
        SessionEventBus bus = new SessionEventBus();
        AskUserPendingStore store = new AskUserPendingStore(bus);
        RecordingOrchestrator orchestrator = new RecordingOrchestrator(store);
        AskUserToolExecutor executor = new AskUserToolExecutor(store, orchestrator);
        List<AgentEvent> events = new ArrayList<>();

        ExecutorService pool = Executors.newSingleThreadExecutor();
        try {
            CompletableFuture<ToolResult> future = CompletableFuture.supplyAsync(
                () -> executor.execute(new JSONObject().set("question", "在吗？"),
                    context("s2", events)), pool);
            awaitAskEvent(events);
            String askId = events.get(0).getData().getStr("askId");
            // ask_resolved 经事件总线广播（收敛所有打开窗口的卡片），订阅总线验证
            List<String> busEvents = new ArrayList<>();
            bus.subscribe("s2", (type, data) -> {
                busEvents.add(type);
                return true;
            });
            // 跨会话：拒绝
            assertFalse(store.resolve("other", askId, "偷答"));
            // 同会话：唤醒
            assertTrue(store.resolve("s2", askId, "在"));
            ToolResult result = future.get();
            assertTrue(result.isSuccess());
            assertNotNull(result.getPayload());
            assertTrue(busEvents.contains("ask_resolved"));
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    @DisplayName("超时未答：自动代答 recommended 选项并编排为新轮对话")
    void timeoutAutoAnswersRecommended() throws Exception {
        SessionEventBus bus = new SessionEventBus();
        AskUserPendingStore store = new AskUserPendingStore(bus);
        RecordingOrchestrator orchestrator = new RecordingOrchestrator(store);
        AskUserToolExecutor executor = new AskUserToolExecutor(store, orchestrator);
        List<AgentEvent> events = new ArrayList<>();

        JSONArray options = new JSONArray();
        options.add(new JSONObject().set("label", "先做A"));
        options.add(new JSONObject().set("label", "直接做B").set("recommended", true));
        JSONObject args = new JSONObject()
            .set("question", "先做哪个？")
            .set("options", options)
            .set("timeoutSeconds", 5);

        ExecutorService pool = Executors.newSingleThreadExecutor();
        try {
            ToolResult result = CompletableFuture.supplyAsync(
                () -> executor.execute(args, context("s3", events)), pool).get();
            awaitAskEvent(events);
            assertTrue(result.isSuccess());
            assertTrue(result.getPayload().contains("\"auto\":true"));
            assertTrue(result.getPayload().contains("直接做B"));
            // 新轮编排：以 recommended 选项作为用户答案
            assertEquals(1, orchestrator.calls.size());
            String[] call = orchestrator.calls.get(0);
            assertEquals("s3", call[0]);
            assertEquals("直接做B", call[2]);
            assertEquals("true", call[3]);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    @DisplayName("超时未答且无 recommended：自动代答第一个选项")
    void timeoutAutoAnswersFirstOption() throws Exception {
        SessionEventBus bus = new SessionEventBus();
        AskUserPendingStore store = new AskUserPendingStore(bus);
        RecordingOrchestrator orchestrator = new RecordingOrchestrator(store);
        AskUserToolExecutor executor = new AskUserToolExecutor(store, orchestrator);
        List<AgentEvent> events = new ArrayList<>();

        JSONArray options = new JSONArray();
        options.add(new JSONObject().set("label", "浅色"));
        options.add(new JSONObject().set("label", "深色"));
        JSONObject args = new JSONObject()
            .set("question", "哪个主题？")
            .set("options", options)
            .set("timeoutSeconds", 5);

        ExecutorService pool = Executors.newSingleThreadExecutor();
        try {
            ToolResult result = CompletableFuture.supplyAsync(
                () -> executor.execute(args, context("s4", events)), pool).get();
            awaitAskEvent(events);
            assertTrue(result.isSuccess());
            assertEquals(1, orchestrator.calls.size());
            assertEquals("浅色", orchestrator.calls.get(0)[2]);
            assertEquals("true", orchestrator.calls.get(0)[3]);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    @DisplayName("超时未答且无选项：不代答不编排，返回「未回应」由模型收尾")
    void timeoutWithoutOptionsKeepsNotice() throws Exception {
        SessionEventBus bus = new SessionEventBus();
        AskUserPendingStore store = new AskUserPendingStore(bus);
        RecordingOrchestrator orchestrator = new RecordingOrchestrator(store);
        AskUserToolExecutor executor = new AskUserToolExecutor(store, orchestrator);
        List<AgentEvent> events = new ArrayList<>();

        JSONObject args = new JSONObject()
            .set("question", "预算范围是多少？")
            .set("timeoutSeconds", 5);

        ExecutorService pool = Executors.newSingleThreadExecutor();
        try {
            ToolResult result = CompletableFuture.supplyAsync(
                () -> executor.execute(args, context("s5", events)), pool).get();
            awaitAskEvent(events);
            assertTrue(result.isSuccess());
            assertTrue(result.getPayload().contains("\"timeout\":true"));
            assertTrue(result.getPayload().contains("未在"));
            assertTrue(orchestrator.calls.isEmpty());
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    @DisplayName("连续自动代答达上限（编排器拒绝）：退化为「未回应」收尾，不再自答")
    void timeoutAutoAnswerRefusedFallsBackToNotice() throws Exception {
        SessionEventBus bus = new SessionEventBus();
        AskUserPendingStore store = new AskUserPendingStore(bus);
        // 拒绝型编排器：模拟 AskUserFlowService 连续 auto 达到 max-auto-answers 上限
        cn.boommanpro.gaia.workflow.app.agent.session.AskUserRoundOrchestrator refusing =
            (sessionKey, askId, answer, auto, awaitRunExit) -> false;
        AskUserToolExecutor executor = new AskUserToolExecutor(store, refusing);
        List<AgentEvent> events = new ArrayList<>();

        JSONArray options = new JSONArray();
        options.add(new JSONObject().set("label", "A").set("recommended", true));
        JSONObject args = new JSONObject()
            .set("question", "继续吗？")
            .set("options", options)
            .set("timeoutSeconds", 5);

        ExecutorService pool = Executors.newSingleThreadExecutor();
        try {
            ToolResult result = CompletableFuture.supplyAsync(
                () -> executor.execute(args, context("s6", events)), pool).get();
            awaitAskEvent(events);
            assertTrue(result.isSuccess());
            assertTrue(result.getPayload().contains("\"timeout\":true"));
            assertTrue(result.getPayload().contains("上限"));
            assertTrue(!result.getPayload().contains("\"auto\":true"));
        } finally {
            pool.shutdownNow();
        }
    }
}
