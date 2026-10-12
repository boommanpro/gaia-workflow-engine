package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.boommanpro.gaia.workflow.app.agent.session.AskUserPendingStore;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * ask_user —— 向用户提问并等待回答（对标 dsh/OWB 的 ask 工具，取代 ::options 文本协议）。
 *
 * <p>需要用户选择或补充信息时调用：提问以交互卡片展示（问题 + 选项按钮 + 自由输入），
 * 用户作答后本工具返回回答文本，模型据此继续。超时 5 分钟未答按「未回应」返回，
 * 模型应按已有信息继续而不是重复追问。</p>
 */
@Slf4j
@Component
public class AskUserToolExecutor implements ToolExecutor {

    private static final long TIMEOUT_MINUTES = 5;

    private final AskUserPendingStore pendingStore;

    public AskUserToolExecutor(AskUserPendingStore pendingStore) {
        this.pendingStore = pendingStore;
    }

    @Override
    public String name() {
        return "ask_user";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "向用户提问并等待回答（需要用户选择/确认/补充信息时用；不要在正文里输出选项文本）";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String question = args.getStr("question");
        if (question == null || question.trim().isEmpty()) {
            return ToolResult.fail("{\"error\":{\"code\":\"INVALID_ARGS\",\"violations\":[{\"path\":\"question\",\"fix\":\"question 必填，一句话说清要用户决定什么\"}]}}",
                "question 不能为空", cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode.INVALID_ARGS);
        }
        JSONArray options = args.getJSONArray("options");
        if (options != null && options.size() > 5) {
            return ToolResult.fail("{\"error\":{\"code\":\"INVALID_ARGS\",\"violations\":[{\"path\":\"options\",\"fix\":\"选项最多 5 个；更多选择说明问题该拆解了\"}]}}",
                "options 最多 5 个", cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode.INVALID_ARGS);
        }

        String sessionKey = context.getSessionKey();
        String askId = "ask-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        AskUserPendingStore.PendingAsk ask = pendingStore.create(sessionKey, askId);

        JSONObject event = new JSONObject()
            .set("askId", askId)
            .set("question", question.trim());
        if (options != null && !options.isEmpty()) {
            event.set("options", options);
        }
        try {
            context.getSink().emit(AgentEvent.of("ask_request", event));
        } catch (Exception e) {
            pendingStore.drop(askId);
            log.debug("[ask-user] event emit failed: {}", e.getMessage());
        }

        try {
            String answer = ask.answer.get(TIMEOUT_MINUTES, TimeUnit.MINUTES);
            return ToolResult.ok(new JSONObject()
                .set("askId", askId)
                .set("answer", answer)
                .toString(), "用户已作答");
        } catch (Exception e) {
            pendingStore.drop(askId);
            String reason = e instanceof java.util.concurrent.TimeoutException
                ? "用户未在 5 分钟内回应。请基于已有信息继续推进，把未确认的点在结语中列出来，不要重复追问。"
                : "提问等待被中断（运行已停止）。";
            return ToolResult.ok(new JSONObject()
                .set("askId", askId)
                .set("timeout", true)
                .set("answer", reason)
                .toString(), reason);
        }
    }
}
