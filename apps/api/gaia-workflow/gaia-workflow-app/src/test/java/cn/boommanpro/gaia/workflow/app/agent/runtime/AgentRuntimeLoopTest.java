package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult;
import cn.boommanpro.gaia.workflow.app.agent.core.SteeringInbox;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmChatRequest;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import static cn.boommanpro.gaia.workflow.app.agent.runtime.AgentTestHarness.FakeConversationStore;
import static cn.boommanpro.gaia.workflow.app.agent.runtime.AgentTestHarness.RuntimeFixture;
import static cn.boommanpro.gaia.workflow.app.agent.runtime.AgentTestHarness.ScriptedTool;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * AgentRuntime 主循环单测（dsh 式：脚本化 LLM 回放 + 内存存储 + 事件断言）。
 */
class AgentRuntimeLoopTest {

    // ---------- 1. 多轮工具循环 ----------

    @Test
    void multiTurnToolLoopCompletesNaturally() {
        ScriptedTool echo = new ScriptedTool("echo", args -> ToolResult.ok("{\"ok\":true}"));
        RuntimeFixture fixture = new RuntimeFixture(echo);
        fixture.llm.enqueueToolCall("c1", "echo", "{\"text\":\"hi\"}");
        fixture.llm.enqueueText("最终答复");

        AgentRunResult result = fixture.runtime.run(fixture.request("s1", "跑一下"), fixture.sink);

        assertThat(result.isError()).as("自然结束不应报错").isFalse();
        assertThat(result.getContent()).isEqualTo("最终答复");
        assertThat(result.getTurns()).isEqualTo(2);
        assertThat(result.isAbortedByTurnLimit()).isFalse();
        assertThat(result.getExecutedTools()).containsExactly("echo");
        // 持久化序列：assistant(tool_calls) → tool 结果 → assistant 终答
        assertThat(fixture.store.roles()).containsExactly("assistant", "tool", "assistant");
        assertThat(fixture.store.saved.get(1).getToolCallId()).isEqualTo("c1");
        // 事件序列：模型可见的关键节点全量在日志（model-visible ⟺ logged）
        assertThat(fixture.sink.structuralTypes()).containsSubsequence(
            "turn", "llm_request", "llm_end", "assistant_settled", "tool_call", "tool_result");
        assertThat(fixture.sink.count("llm_request")).isEqualTo(2);
    }

    // ---------- 2. 协作式真中断 ----------

    @Test
    void interruptSynthesizesResultsForUnexecutedCalls() {
        AtomicBoolean cancelled = new AtomicBoolean(false);
        // 第一个工具执行时触发取消：第二个调用不应执行，而是拿到合成中断结果
        ScriptedTool first = new ScriptedTool("slow_tool", args -> {
            cancelled.set(true);
            return ToolResult.ok("{}");
        });
        RuntimeFixture fixture = new RuntimeFixture(first);
        fixture.llm.enqueueTextWithCalls("开始",
            new String[]{"c1", "slow_tool", "{}"},
            new String[]{"c2", "never_tool", "{}"});

        AgentRunResult result = fixture.runtime.run(
            fixture.requestWithInterrupt("s2", "跑", cancelled::get), fixture.sink);

        assertThat(result.isInterrupted()).isTrue();
        assertThat(result.getExecutedTools()).containsExactly("slow_tool");
        // 两个 tool_call 都必须有对应结果（配对完整性）
        List<AgentTestHarness.SavedMessage> toolMessages = toolMessages(fixture);
        assertThat(toolMessages).hasSize(2);
        assertThat(toolMessages.get(0).getToolCallId()).isEqualTo("c1");
        assertThat(toolMessages.get(1).getToolCallId()).isEqualTo("c2");
        assertThat(toolMessages.get(1).getContent()).contains("中断");
        // 中断标记事件 + assistant 落库
        assertThat(fixture.sink.count("interrupted")).isEqualTo(1);
        assertThat(fixture.store.saved.stream().anyMatch(m ->
            "assistant".equals(m.getRole()) && m.getContent() != null && m.getContent().contains("中断"))).isTrue();
    }

    // ---------- 3. LLM 失败重试（durable-before-wait） ----------

    @Test
    @Timeout(30)
    void retryOnRetryableErrorThenSucceed() {
        RuntimeFixture fixture = new RuntimeFixture();
        fixture.llm.enqueueFailed("LLM 调用失败: 429 rate limited", "RATE_LIMIT");
        fixture.llm.enqueueFailed("LLM 调用失败: 500 oops", "SERVER");
        fixture.llm.enqueueText("重试后成功");

        AgentRunResult result = fixture.runtime.run(fixture.request("s3", "跑"), fixture.sink);

        assertThat(result.isError()).isFalse();
        assertThat(result.getContent()).isEqualTo("重试后成功");
        // 3 次真实调用（2 失败 + 1 成功），2 条重试事件（先落日志再睡眠）
        assertThat(fixture.llm.requests).hasSize(3);
        assertThat(fixture.sink.count("llm_retry")).isEqualTo(2);
        assertThat(fixture.sink.events.stream()
            .filter(e -> "llm_retry".equals(e.getType()))
            .allMatch(e -> e.getData().getStr("code") != null)).isTrue();
    }

    @Test
    void nonRetryableErrorFailsImmediately() {
        RuntimeFixture fixture = new RuntimeFixture();
        fixture.llm.enqueueFailed("LLM 调用失败: 401 unauthorized", null);

        AgentRunResult result = fixture.runtime.run(fixture.request("s3b", "跑"), fixture.sink);

        assertThat(result.isError()).isTrue();
        assertThat(fixture.llm.requests).hasSize(1);
        assertThat(fixture.sink.count("llm_retry")).isZero();
    }

    // ---------- 4. 空响应重试 ----------

    @Test
    @Timeout(30)
    void emptyResponseIsRetriedAsEmptyResponse() {
        RuntimeFixture fixture = new RuntimeFixture();
        fixture.llm.enqueueText("");
        fixture.llm.enqueueText("恢复内容");

        AgentRunResult result = fixture.runtime.run(fixture.request("s4", "跑"), fixture.sink);

        assertThat(result.isError()).isFalse();
        assertThat(result.getContent()).isEqualTo("恢复内容");
        assertThat(fixture.sink.first("llm_retry").getData().getStr("code")).isEqualTo("EMPTY_RESPONSE");
    }

    // ---------- 5. 熔断分类：基础设施失败计数，参数错不计数 ----------

    @Test
    void circuitBreaksOnInfraFailures() {
        ScriptedTool boom = new ScriptedTool("boom",
            args -> ToolResult.fail("{\"error\":\"down\"}", "服务不可用",
                cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode.EXEC_ERROR));
        RuntimeFixture fixture = new RuntimeFixture(boom);
        for (int i = 0; i < 5; i++) {
            fixture.llm.enqueueToolCall("c" + i, "boom", "{}");
        }

        AgentRunResult result = fixture.runtime.run(fixture.request("s5", "跑"), fixture.sink);

        // 第 4 次失败触发熔断：不再有第 5 次模型调用，回复对用户说明
        assertThat(result.getContent()).contains("自动终止");
        assertThat(fixture.llm.requests.size()).isLessThanOrEqualTo(5);
        assertThat(fixture.sink.events.stream().anyMatch(e ->
            "tool_result".equals(e.getType()) && e.getData().getStr("payload", "").contains("CIRCUIT_BROKEN"))).isTrue();
    }

    @Test
    void invalidArgsDoNotTripCircuit() {
        // 参数 JSON 非法 → INVALID_ARGS（模型可自修信号）：连续多次也不熔断
        ScriptedTool echo = new ScriptedTool("echo", args -> ToolResult.ok("{}"));
        RuntimeFixture fixture = new RuntimeFixture(echo);
        for (int i = 0; i < 5; i++) {
            fixture.llm.enqueueToolCall("bad" + i, "echo", "not-json-at-all{");
        }

        AgentRunResult result = fixture.runtime.run(fixture.request("s6", "跑"), fixture.sink);

        assertThat(result.isError()).isFalse();
        assertThat(fixture.llm.requests).hasSize(6); // 5 次工具轮 + 1 次脚本耗尽终答
        assertThat(result.getContent()).isEqualTo(fixture.llm.defaultFinal);
        // 回灌给模型的是结构化 INVALID_ARGS（供自修），且从未触发熔断话术
        assertThat(toolMessages(fixture).get(0).getContent()).contains("INVALID_ARGS");
        assertThat(result.getContent()).doesNotContain("自动终止");
    }

    // ---------- 6. steering：run 进行中的消息在 turn 边界注入 ----------

    @Test
    void steeringMessageInjectedAtTurnBoundary() {
        java.util.concurrent.atomic.AtomicReference<SteeringInbox> inboxRef =
            new java.util.concurrent.atomic.AtomicReference<>();
        ScriptedTool echo = new ScriptedTool("echo", args -> {
            SteeringInbox inbox = inboxRef.get();
            if (inbox != null) {
                inbox.offer("别删除，改成只读", null);
            }
            return ToolResult.ok("{}");
        });
        RuntimeFixture fixture = new RuntimeFixture(echo);
        inboxRef.set(fixture.inbox);
        fixture.llm.enqueueToolCall("c1", "echo", "{}");
        fixture.llm.enqueueText("收到修正，按只读处理");

        AgentRunResult result = fixture.runtime.run(fixture.request("s7", "跑"), fixture.sink);

        assertThat(result.isError()).isFalse();
        // 第二次模型请求必须包含 steering 消息（模型在当前 run 内看到）
        LlmChatRequest second = fixture.llm.requests.get(1);
        boolean injected = second.getMessages().stream()
            .anyMatch(m -> "user".equals(m.getRole()) && m.getContent() != null
                && m.getContent().contains("别删除，改成只读"));
        assertThat(injected).as("steering 消息应注入第二个请求").isTrue();
        assertThat(fixture.sink.count("user_message")).isEqualTo(1);
        // steering 消息由 run 侧持久化（不入 FakeStore.saveMessage —— 这里是注入不重复落库）
        assertThat(fixture.store.saved.stream().noneMatch(m ->
            m.getContent() != null && m.getContent().contains("别删除"))).isTrue();
    }

    // ---------- 7. 读工具并行执行 ----------

    @Test
    @Timeout(15)
    void consecutiveConcurrencySafeToolsRunInParallel() {
        CountDownLatch aStarted = new CountDownLatch(1);
        CountDownLatch bStarted = new CountDownLatch(1);
        ScriptedTool readA = new ScriptedTool("read_a", args -> {
            aStarted.countDown();
            try {
                if (!bStarted.await(3, TimeUnit.SECONDS)) {
                    return ToolResult.fail("{\"error\":\"serial\"}", "未观测到并行");
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return ToolResult.ok("{\"a\":1}");
        }, true);
        ScriptedTool readB = new ScriptedTool("read_b", args -> {
            bStarted.countDown();
            try {
                if (!aStarted.await(3, TimeUnit.SECONDS)) {
                    return ToolResult.fail("{\"error\":\"serial\"}", "未观测到并行");
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return ToolResult.ok("{\"b\":1}");
        }, true);
        RuntimeFixture fixture = new RuntimeFixture(readA, readB);
        fixture.llm.enqueueTextWithCalls("并行读",
            new String[]{"c1", "read_a", "{}"},
            new String[]{"c2", "read_b", "{}"});
        fixture.llm.enqueueText("读完");

        long start = System.currentTimeMillis();
        AgentRunResult result = fixture.runtime.run(fixture.request("s8", "跑"), fixture.sink);
        long elapsed = System.currentTimeMillis() - start;

        assertThat(result.isError()).isFalse();
        // 两个工具互相等到对方启动 = 真并行；串行则 3s 超时后失败
        assertThat(elapsed).as("并行执行应在秒级完成").isLessThan(2500);
        assertThat(toolMessages(fixture)).hasSize(2);
        // 结果按调用顺序落库（c1 在前 c2 在后）
        assertThat(toolMessages(fixture).get(0).getToolCallId()).isEqualTo("c1");
        assertThat(toolMessages(fixture).get(1).getToolCallId()).isEqualTo("c2");
    }

    // ---------- 8. spill：超大结果只给模型看预览 ----------

    @Test
    void oversizedToolResultIsSpilledForModel() {
        StringBuilder big = new StringBuilder("{\"data\":\"");
        for (int i = 0; i < 20000; i++) {
            big.append('x');
        }
        big.append("\"}");
        ScriptedTool fat = new ScriptedTool("fat", args -> ToolResult.ok(big.toString()));
        RuntimeFixture fixture = new RuntimeFixture(fat);
        fixture.llm.enqueueToolCall("c1", "fat", "{}");
        fixture.llm.enqueueText("看完了");

        fixture.runtime.run(fixture.request("s9", "跑"), fixture.sink);

        // DB 保存完整内容
        assertThat(toolMessages(fixture).get(0).getContent().length()).isGreaterThan(20000);
        // 模型看到的是裁剪预览
        LlmChatRequest second = fixture.llm.requests.get(1);
        LlmMessage toolView = second.getMessages().stream()
            .filter(m -> "tool".equals(m.getRole())).findFirst().orElseThrow();
        assertThat(toolView.getContent().length()).isLessThan(12000);
        assertThat(toolView.getContent()).contains("内容过长");
    }

    // ---------- 9. 复读护栏（advisory，第 3 次注入提醒） ----------

    @Test
    void repeatedIdenticalCallsTriggerAdvisoryReminder() {
        ScriptedTool echo = new ScriptedTool("echo", args -> ToolResult.ok("{\"ok\":1}"));
        RuntimeFixture fixture = new RuntimeFixture(echo);
        String sameArgs = "{\"x\":42}";
        for (int i = 0; i < 3; i++) {
            fixture.llm.enqueueToolCall("r" + i, "echo", sameArgs);
        }
        fixture.llm.enqueueText("知道了，换策略");

        fixture.runtime.run(fixture.request("s10", "跑"), fixture.sink);

        // 第 4 个请求（第 3 次复读后）应含系统提醒，且 repeat_reminder 事件已外发
        LlmChatRequest fourth = fixture.llm.requests.get(3);
        boolean reminded = fourth.getMessages().stream().anyMatch(m ->
            m.getContent() != null && m.getContent().contains("【系统提示】")
                && m.getContent().contains("完全相同的参数"));
        assertThat(reminded).as("第 3 次复读后应注入 advisory").isTrue();
        assertThat(fixture.sink.count("repeat_reminder")).isEqualTo(1);
    }

    // ---------- 10. 压缩：确定性剪枝路径 ----------

    @Test
    void tokenPressurePrunesOldToolResults() {
        // 小窗口 + 老历史里的大工具结果 → 剪枝把压力压回目标内（不触发摘要）
        RuntimeFixture fixture = new RuntimeFixture();
        fixture.properties.getLlm().setContextWindow(1200);
        fixture.properties.getCompaction().setTriggerRatio(0.5);
        fixture.properties.getCompaction().setMinMessagesToSummarize(50);
        fixture.properties.getCompaction().setPruneToolResultChars(500);
        fixture.properties.getCompaction().setKeepRecentToolResults(0);

        StringBuilder big = new StringBuilder("{\"dsl\":");
        for (int i = 0; i < 2500; i++) {
            big.append('y');
        }
        big.append("}");
        // 预置老历史：assistant(tool_calls) + 巨大 tool 结果 + 收尾
        fixture.store.preload("user", "老消息");
        fixture.store.preload("assistant", "老的助手回复");
        LlmMessage oldTool = new LlmMessage();
        oldTool.setRole("tool");
        oldTool.setToolCallId("old-1");
        oldTool.setContent(big.toString());
        oldTool.setRefId(101L);
        fixture.store.preloadMessage(oldTool);

        ScriptedTool echo = new ScriptedTool("echo", args -> ToolResult.ok("{\"ok\":1}"));
        fixture.executorRegistry.register(echo);
        fixture.llm.enqueueText("完成");

        fixture.runtime.run(fixture.request("s11", "跑"), fixture.sink);

        // 压缩事件落日志，老工具结果被原地剪枝
        assertThat(fixture.sink.count("compaction")).isEqualTo(1);
        Object prunedView = fixture.llm.requests.get(0).getMessages().stream()
            .filter(m -> "tool".equals(m.getRole()))
            .findFirst().map(LlmMessage::getContent).orElse(null);
        assertThat(prunedView).isNotNull();
        assertThat(((String) prunedView).length()).isLessThan(600);
    }

    // ---------- 11. 压缩后仍超硬上限 → 明确收束 ----------

    @Test
    void contextOverflowStopsRunWithClearMessage() {
        RuntimeFixture fixture = new RuntimeFixture();
        fixture.properties.getLlm().setContextWindow(300); // 极小窗口
        fixture.properties.getCompaction().setTriggerRatio(0.5);
        fixture.properties.getCompaction().setMinMessagesToSummarize(50); // 禁用摘要路径

        StringBuilder huge = new StringBuilder();
        for (int i = 0; i < 5000; i++) {
            huge.append('x');
        }
        fixture.store.preload("user", huge.toString());

        AgentRunResult result = fixture.runtime.run(fixture.request("s12", "跑"), fixture.sink);

        assertThat(result.getContent()).contains("上下文长度已超出");
        assertThat(result.isAbortedByTurnLimit()).isTrue();
        assertThat(fixture.llm.requests).isEmpty(); // 一次都没发出去
    }

    // ---------- 12. 系统提示词跨轮稳定（前缀缓存友好） ----------

    @Test
    void systemPromptStableAcrossTurns() {
        ScriptedTool echo = new ScriptedTool("echo", args -> ToolResult.ok("{}"));
        RuntimeFixture fixture = new RuntimeFixture(echo);
        fixture.llm.enqueueToolCall("c1", "echo", "{}");
        fixture.llm.enqueueText("done");

        fixture.runtime.run(fixture.request("s13", "跑"), fixture.sink);

        List<LlmChatRequest> requests = fixture.llm.requests;
        assertThat(requests).hasSize(2);
        String firstPrompt = requests.get(0).getMessages().get(0).getContent();
        String secondPrompt = requests.get(1).getMessages().get(0).getContent();
        assertThat(firstPrompt).isEqualTo(secondPrompt);
        assertThat(firstPrompt).doesNotContain("第 1 轮").doesNotContain("第 2 轮");
    }

    // ---------- helpers ----------

    private static List<AgentTestHarness.SavedMessage> toolMessages(RuntimeFixture fixture) {
        return fixture.store.saved.stream()
            .filter(m -> "tool".equals(m.getRole()))
            .collect(java.util.stream.Collectors.toList());
    }
}
