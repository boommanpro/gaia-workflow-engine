package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.boommanpro.gaia.workflow.app.agent.llm.LlmChatRequest;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmChatResponse;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmProvider;
import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static cn.boommanpro.gaia.workflow.app.agent.runtime.AgentTestHarness.FakeConversationStore;
import static cn.boommanpro.gaia.workflow.app.agent.runtime.AgentTestHarness.ScriptedLlmProvider;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * ContextCompactor 单测：确定性剪枝、配对安全切点、surface replace 持久化。
 */
class ContextCompactorTest {

    private static LlmMessage msg(String role, String content) {
        LlmMessage m = new LlmMessage();
        m.setRole(role);
        m.setContent(content);
        m.setRefId((long) (Math.abs(content.hashCode()) % 10000 + 1));
        return m;
    }

    private static LlmMessage toolMsg(long refId, String content) {
        LlmMessage m = new LlmMessage();
        m.setRole("tool");
        m.setToolCallId("t-" + refId);
        m.setContent(content);
        m.setRefId(refId);
        return m;
    }

    // ---------- 剪枝形态 ----------

    @Test
    void pruneReadWorkflowPayloadKeepsCasBasis() {
        String payload = new JSONObject()
            .set("workflowCode", "wf_demo")
            .set("revision", 7)
            .set("dsl", new JSONObject().set("nodes", JSONUtil.parseArray("[{},{},{}]")))
            .toString();
        // 撑大 payload 超过剪枝阈值意义
        String big = payload.substring(0, payload.length() - 1) + ",\"junk\":\"" + "z".repeat(2000) + "\"}";

        String pruned = ContextCompactor.pruneToolPayload(big);

        JSONObject obj = JSONUtil.parseObj(pruned);
        assertThat(obj.getStr("pruned")).isEqualTo("read_workflow");
        assertThat(obj.getStr("workflowCode")).isEqualTo("wf_demo");
        assertThat(obj.getInt("revision")).isEqualTo(7);
        assertThat(obj.getInt("nodeCount")).isEqualTo(3);
        assertThat(obj.getStr("note")).contains("read_node");
    }

    @Test
    void pruneGenericPayloadKeepsHead() {
        String big = "{\"result\":\"" + "a".repeat(3000) + "\"}";
        String pruned = ContextCompactor.pruneToolPayload(big);
        JSONObject obj = JSONUtil.parseObj(pruned);
        assertThat(obj.getBool("pruned")).isTrue();
        assertThat(obj.getInt("originalChars")).isGreaterThan(3000);
        assertThat(obj.getStr("head").length()).isLessThanOrEqualTo(400);
    }

    // ---------- 配对安全切点 ----------

    @Test
    void boundaryNeverSplitsToolPair() {
        // user, assistant(tool_calls), tool, user, assistant
        List<LlmMessage> conversation = new ArrayList<>();
        conversation.add(msg("user", "开始"));
        conversation.add(msg("assistant", "我调工具"));
        conversation.add(toolMsg(3, "{}"));
        conversation.add(toolMsg(4, "{}"));
        conversation.add(msg("user", "继续"));
        conversation.add(msg("assistant", "好的"));

        // 期望切点 3 落在 tool 消息上（其调用方在将被摘要的一侧）→ 必须回退到非 tool 位置
        int boundary = ContextCompactor.chooseBoundary(conversation, 3);
        assertThat(boundary).isLessThanOrEqualTo(1);
        assertThat(conversation.get(boundary).getRole()).isNotEqualTo("tool");
        // 切点落在普通消息上则保持不动
        assertThat(ContextCompactor.chooseBoundary(conversation, 4)).isEqualTo(4);
    }

    @Test
    void boundaryAtPlainMessageStays() {
        List<LlmMessage> conversation = new ArrayList<>();
        conversation.add(msg("user", "a"));
        conversation.add(msg("assistant", "b"));
        conversation.add(msg("user", "c"));
        conversation.add(msg("assistant", "d"));

        assertThat(ContextCompactor.chooseBoundary(conversation, 2)).isEqualTo(2);
    }

    // ---------- 端到端：剪枝 → 摘要 → surface replace ----------

    @Test
    void compactSummarizesPrefixAndPersistsSurfaceReplace() {
        AgentProperties properties = new AgentProperties();
        properties.getLlm().setContextWindow(800);
        properties.getCompaction().setTriggerRatio(0.5);   // 目标 400 tokens
        properties.getCompaction().setKeepRecentMessages(3);
        properties.getCompaction().setMinMessagesToSummarize(4);

        FakeConversationStore store = new FakeConversationStore();
        ScriptedLlmProvider llm = new ScriptedLlmProvider();
        ContextCompactor compactor = new ContextCompactor(properties, store);

        List<LlmMessage> conversation = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            conversation.add(msg("user", "用户第" + i + "条消息，内容足够长需要被压缩掉。" + "细节".repeat(30)));
            conversation.add(msg("assistant", "助手回复第" + i + "条。" + "过程".repeat(30)));
        }

        ContextCompactor.Result result = compactor.compactIfNeeded(
            "s-test", "SYSTEM", conversation, llm, null, null);

        assertThat(result.compacted).isTrue();
        assertThat(result.summarizedMessages).isGreaterThan(0);
        // surface replace 持久化：前缀 id 全部打标 + 摘要入库
        assertThat(store.compactedIds).hasSize(result.summarizedMessages);
        assertThat(store.summaries).hasSize(1);
        assertThat(store.summaries.get(0)).startsWith(ContextCompactor.SUMMARY_MARKER);
        // 列表被替换为：[摘要 user] + 保留尾部
        assertThat(conversation.get(0).getRole()).isEqualTo("user");
        assertThat(conversation.get(0).getContent()).contains("SUMMARY-OF-PREFIX");
        assertThat(conversation.size()).isEqualTo(1 + 3);
        // 压缩后 token 下降
        assertThat(result.tokensAfter).isLessThan(result.tokensBefore);
    }

    @Test
    void compactSkipsWhenUnderTarget() {
        AgentProperties properties = new AgentProperties();
        FakeConversationStore store = new FakeConversationStore();
        ScriptedLlmProvider llm = new ScriptedLlmProvider();
        ContextCompactor compactor = new ContextCompactor(properties, store);

        List<LlmMessage> conversation = new ArrayList<>();
        conversation.add(msg("user", "hi"));
        conversation.add(msg("assistant", "hello"));

        ContextCompactor.Result result = compactor.compactIfNeeded("s", "SYS", conversation, llm, null, null);

        assertThat(result.compacted).isFalse();
        assertThat(store.summaries).isEmpty();
    }

    @Test
    void usageAnchorRaisesEstimate() {
        AgentProperties properties = new AgentProperties();
        ContextCompactor compactor = new ContextCompactor(properties, new FakeConversationStore());
        List<LlmMessage> conversation = new ArrayList<>();
        conversation.add(msg("user", "hello world"));

        long estimate = compactor.estimateTotal("SYS", conversation, null);
        long anchored = compactor.estimateTotal("SYS", conversation, 999_999L);

        assertThat(anchored).isEqualTo(999_999L);
        assertThat(estimate).isLessThan(anchored);
    }

    // ---------- 摘要失败降级 ----------

    @Test
    void summarizerFailureKeepsPrunedViewOnly() {
        AgentProperties properties = new AgentProperties();
        properties.getLlm().setContextWindow(800);
        properties.getCompaction().setTriggerRatio(0.5);
        properties.getCompaction().setKeepRecentMessages(2);
        properties.getCompaction().setMinMessagesToSummarize(2);

        FakeConversationStore store = new FakeConversationStore();
        // 摘要器永远失败
        LlmProvider broken = new LlmProvider() {
            @Override
            public String getId() {
                return "broken";
            }

            @Override
            public String getName() {
                return "broken";
            }

            @Override
            public boolean isAvailable() {
                return true;
            }

            @Override
            public LlmChatResponse chat(LlmChatRequest request) {
                return LlmChatResponse.failed("summarizer down", "SERVER");
            }
        };
        ContextCompactor compactor = new ContextCompactor(properties, store);

        List<LlmMessage> conversation = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            conversation.add(msg("user", "消息" + i + "内容".repeat(40)));
        }

        ContextCompactor.Result result = compactor.compactIfNeeded("s", "SYS", conversation, broken, null, null);

        // 摘要失败不崩溃、不产生 surface replace；消息序列保持完整
        assertThat(result.summarizedMessages).isZero();
        assertThat(store.summaries).isEmpty();
        assertThat(conversation).hasSize(5);
    }
}
