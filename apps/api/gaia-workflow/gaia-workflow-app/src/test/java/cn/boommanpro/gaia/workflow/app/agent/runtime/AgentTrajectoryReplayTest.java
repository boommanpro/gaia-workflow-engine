package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static cn.boommanpro.gaia.workflow.app.agent.runtime.AgentTestHarness.RuntimeFixture;
import static cn.boommanpro.gaia.workflow.app.agent.runtime.AgentTestHarness.ScriptedTool;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * 轨迹回放测试（对齐 dsh snapshot replay：无 key 回放已录模型响应）。
 *
 * <p>fixture 是 JSON 文件（test/resources/agent-trajectory/*.json）：
 * 预置历史 + 按序的模型响应 + 每个工具调用的既定结果 + 期望断言。
 * 跑完校验「最终结果 / 持久化消息序列 / 事件日志序列」三件事，
 * 协议或持久化行为回归时无需真人重放即可发现。</p>
 */
class AgentTrajectoryReplayTest {

    @TestFactory
    List<DynamicTest> replayAllTrajectories() throws Exception {
        String[] fixtures = {"iteration-flow.json", "stale-revision-recovery.json"};
        List<DynamicTest> tests = new ArrayList<>();
        for (String fixtureName : fixtures) {
            String json = readResource("/agent-trajectory/" + fixtureName);
            JSONObject fixture = JSONUtil.parseObj(json);
            tests.add(DynamicTest.dynamicTest("replay:" + fixture.getStr("name", fixtureName), () ->
                replay(fixture)));
        }
        return tests;
    }

    private void replay(JSONObject fixture) {
        CALL_SEQ.clear();
        // 既定工具结果：跨步骤合并，key = "工具名#该工具的第几次调用"
        Map<String, String> resultsByCallId = new HashMap<>();
        JSONArray steps = fixture.getJSONArray("steps");
        for (int i = 0; i < steps.size(); i++) {
            JSONObject results = steps.getJSONObject(i).getJSONObject("results");
            if (results == null) {
                continue;
            }
            for (String key : results.keySet()) {
                Object value = results.get(key);
                resultsByCallId.put(key, value instanceof String ? (String) value : value.toString());
            }
        }

        List<ScriptedTool> scriptedTools = new ArrayList<>();
        for (Object toolNameObj : fixture.getJSONArray("tools")) {
            String toolName = String.valueOf(toolNameObj);
            scriptedTools.add(new ScriptedTool(toolName, args -> {
                String candidate = toolName + "#" + scriptedToolCount(toolName);
                String result = resultsByCallId.get(candidate);
                if (result == null) {
                    return ToolResult.ok("{\"ok\":true,\"auto\":\"" + candidate + "\"}");
                }
                return ToolResult.ok(result);
            }));
        }
        RuntimeFixture fixtureRuntime = new RuntimeFixture(scriptedTools.toArray(new ScriptedTool[0]));

        // 2. 预置历史消息
        JSONArray history = fixture.getJSONArray("history");
        if (history != null) {
            for (int i = 0; i < history.size(); i++) {
                JSONObject h = history.getJSONObject(i);
                if ("tool".equals(h.getStr("role"))) {
                    cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage m =
                        new cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage();
                    m.setRole("tool");
                    m.setToolCallId(h.getStr("toolCallId"));
                    m.setContent(h.getStr("content"));
                    fixtureRuntime.store.preloadMessage(m);
                } else {
                    fixtureRuntime.store.preload(h.getStr("role"), h.getStr("content"));
                }
            }
        }

        // 3. 脚本化模型响应
        for (int i = 0; i < steps.size(); i++) {
            JSONObject response = steps.getJSONObject(i).getJSONObject("response");
            List<cn.boommanpro.gaia.workflow.app.agent.llm.LlmToolCall> calls = new ArrayList<>();
            JSONArray toolCalls = response.getJSONArray("toolCalls");
            if (toolCalls != null) {
                for (int j = 0; j < toolCalls.size(); j++) {
                    JSONObject c = toolCalls.getJSONObject(j);
                    calls.add(cn.boommanpro.gaia.workflow.app.agent.llm.LlmToolCall.builder()
                        .id(c.getStr("id")).name(c.getStr("name"))
                        .arguments(c.getStr("arguments", "{}")).build());
                }
            }
            fixtureRuntime.llm.script.add(cn.boommanpro.gaia.workflow.app.agent.llm.LlmChatResponse.builder()
                .content(response.getStr("content", ""))
                .toolCalls(calls).build());
        }

        // 4. 跑
        String userMessage = fixture.getStr("userMessage", "任务");
        AgentRequest request = fixtureRuntime.request("replay-session", userMessage);
        AgentRunResult result = fixtureRuntime.runtime.run(request, fixtureRuntime.sink);

        // 5. 断言
        JSONObject expect = fixture.getJSONObject("expect");
        assertThat(result.isError())
            .as("run 不应失败").isFalse();
        assertThat(result.getContent())
            .as("最终回复").isEqualTo(expect.getStr("finalContent"));
        assertThat(result.getTurns())
            .as("轮次").isEqualTo(expect.getInt("turns"));

        JSONArray expectedRoles = expect.getJSONArray("savedRoles");
        if (expectedRoles != null) {
            List<String> actual = fixtureRuntime.store.roles();
            assertThat(actual).as("持久化消息角色序列").containsExactlyElementsOf(toStrings(expectedRoles));
        }
        JSONArray expectedTools = expect.getJSONArray("executedTools");
        if (expectedTools != null) {
            assertThat(result.getExecutedTools())
                .as("执行的工具序列").containsExactlyElementsOf(toStrings(expectedTools));
        }
        JSONArray expectedEvents = expect.getJSONArray("eventSequenceContains");
        if (expectedEvents != null) {
            assertThat(fixtureRuntime.sink.structuralTypes())
                .as("结构性事件序列").containsSubsequence(toArray(expectedEvents));
        }
    }

    /** 工具调用序号（按工具名独立递增），用于把执行器调用映射到 fixture 的 callId */
    private static final java.util.concurrent.ConcurrentMap<String, java.util.concurrent.atomic.AtomicInteger>
        CALL_SEQ = new java.util.concurrent.ConcurrentHashMap<>();

    private static int scriptedToolCount(String toolName) {
        return CALL_SEQ.computeIfAbsent(toolName, k -> new java.util.concurrent.atomic.AtomicInteger())
            .incrementAndGet();
    }

    private static List<String> toStrings(JSONArray array) {
        List<String> list = new ArrayList<>();
        for (Object o : array) {
            list.add(String.valueOf(o));
        }
        return list;
    }

    private static String[] toArray(JSONArray array) {
        return toStrings(array).toArray(new String[0]);
    }

    private static String readResource(String path) throws Exception {
        try (InputStream is = AgentTrajectoryReplayTest.class.getResourceAsStream(path)) {
            if (is == null) {
                throw new IllegalStateException("fixture not found: " + path);
            }
            byte[] buffer = new byte[8192];
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            int n;
            while ((n = is.read(buffer)) > 0) {
                out.write(buffer, 0, n);
            }
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }
}
