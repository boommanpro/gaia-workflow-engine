package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

/**
 * ask_user 悬赏池 —— 挂起中的「向用户提问」登记处。
 *
 * <p>执行器提问时登记（{@link #create}），前端收到 ask_request 事件渲染交互卡片；
 * 用户点选/输入后 REST 端点调 {@link #resolve} 唤醒挂起的工具调用，
 * 并广播 ask_resolved 事件让所有打开的窗口同步收敛卡片状态。</p>
 *
 * <p>等待有 5 分钟上限（在执行器侧超时），池子只做登记与唤醒，不做清理线程 ——
 * 超时/中断路径由执行器自己摘除。</p>
 */
@Slf4j
@Service
public class AskUserPendingStore {

    /** 一次挂起中的提问 */
    public static final class PendingAsk {
        public final String sessionKey;
        public final CompletableFuture<String> answer = new CompletableFuture<>();

        PendingAsk(String sessionKey) {
            this.sessionKey = sessionKey;
        }
    }

    private final SessionEventBus eventBus;
    private final Map<String, PendingAsk> pending = new ConcurrentHashMap<>();

    public AskUserPendingStore(SessionEventBus eventBus) {
        this.eventBus = eventBus;
    }

    public PendingAsk create(String sessionKey, String askId) {
        PendingAsk ask = new PendingAsk(sessionKey);
        pending.put(askId, ask);
        return ask;
    }

    /** 用户作答：唤醒挂起的工具并广播收敛；不存在/跨会话返回 false */
    public boolean resolve(String sessionKey, String askId, String answer) {
        return resolve(sessionKey, askId, answer, false);
    }

    /**
     * 作答（用户或超时自动代答）：唤醒挂起的工具并广播收敛。
     *
     * @param auto 是否超时自动代答（前端据此把卡片标注为「超时自动选择」）
     */
    public boolean resolve(String sessionKey, String askId, String answer, boolean auto) {
        PendingAsk ask = pending.get(askId);
        if (ask == null || !ask.sessionKey.equals(sessionKey)) {
            return false;
        }
        pending.remove(askId);
        ask.answer.complete(answer != null ? answer : "");
        try {
            eventBus.publish(sessionKey, "ask_resolved",
                new JSONObject().set("askId", askId).set("answer", answer).set("auto", auto));
        } catch (Exception e) {
            log.debug("[ask-user] resolved event publish failed: {}", e.getMessage());
        }
        log.info("[ask-user] resolved session={} askId={} auto={} answerLen={}",
            sessionKey, askId, auto, answer == null ? 0 : answer.length());
        return true;
    }

    /** 超时/中断收尾：摘除登记（future 由调用方处置） */
    public void drop(String askId) {
        pending.remove(askId);
    }
}
