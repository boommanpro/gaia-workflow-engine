package cn.boommanpro.gaia.workflow.app.agent.session;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * {@link AskUserRoundOrchestrator} 的默认实现：作答 → 新一轮对话。
 *
 * <p>执行顺序有讲究：先 resolve（唤醒挂起工具 + 广播 ask_resolved 收敛所有窗口的卡片），
 * 再 stop（旧 run 标记取消，主循环在工具返回后的检查点退出，不会带着答案继续推理），
 * 最后 startRun（答案作为用户消息落库并启动新 run）。</p>
 *
 * <p>stop 与 startRun 之间旧 run 可能尚未完全退出，此时 startRun 走 steering 收件箱，
 * 由旧 run 的收尾 chainSteering 链接成新 run —— 两条路径最终都恰好产生一个新 run。</p>
 *
 * <p><b>连续自动代答上限</b>：超时自动代答会让「模型追问 → 没人答 → 自动选 → 又追问」
 * 变成无人值守的自驱循环（实测发生过）。同一会话内连续 auto 代答超过
 * {@code agent.ask-user.max-auto-answers}（默认 2）后拒绝再代答，执行器按「未回应」
 * 让模型收尾；用户真实作答或间隔超过 TTL 都会重置计数。</p>
 */
@Slf4j
@Service
public class AskUserFlowService implements AskUserRoundOrchestrator {

    /** 连续 auto 代答计数窗口：超过该时长未活动，计数视为过期归零（用户离开又回来的场景） */
    private static final long AUTO_STREAK_TTL_MS = 10 * 60 * 1000L;

    private final AskUserPendingStore pendingStore;
    private final AgentSessionRunService runService;

    /** 连续自动代答上限（后台可配） */
    @Value("${agent.ask-user.max-auto-answers:2}")
    private int maxAutoAnswers = 2;

    /** 会话 → {连续 auto 次数, 最近一次时间} */
    private static final class AutoStreak {
        int count;
        long updatedAt;
    }

    private final ConcurrentMap<String, AutoStreak> autoStreaks = new ConcurrentHashMap<>();

    public AskUserFlowService(AskUserPendingStore pendingStore,
                              @Lazy AgentSessionRunService runService) {
        this.pendingStore = pendingStore;
        this.runService = runService;
    }

    @Override
    public boolean startRound(String sessionKey, String askId, String answer, boolean auto, boolean awaitRunExit) {
        if (auto && autoStreakReached(sessionKey)) {
            log.info("[ask-user] auto-answer refused (consecutive cap {} reached) session={} askId={}",
                maxAutoAnswers, sessionKey, askId);
            return false;
        }
        if (!pendingStore.resolve(sessionKey, askId, answer, auto)) {
            return false;
        }
        if (auto) {
            bumpAutoStreak(sessionKey);
        } else {
            // 用户真实作答：自驱循环解除
            autoStreaks.remove(sessionKey);
        }
        // ask_handoff：告知引擎这是「作答交接」而非异常中断 —— 收尾不落 ⏹ marker、
        // 不发 interrupted 事件（否则每次作答都会刷一条「本次运行已被中断」噪音）
        runService.stop(sessionKey, "ask_handoff");
        if (awaitRunExit) {
            // 等旧 run 收尾落库（中断 assistant 行 / 时间线），再写答案用户行 ——
            // 不等的话答案是先落库的，重放时答案气泡会排到提问卡前面（顺序倒挂）。
            // 工具已拿到返回值，run 在检查点退出，通常毫秒级；上限 3s 防御性兜底
            long deadline = System.currentTimeMillis() + 3000;
            while (runService.isRunning(sessionKey) && System.currentTimeMillis() < deadline) {
                try {
                    Thread.sleep(25);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        runService.startRun(sessionKey, answer, null, null, null, null);
        log.info("[ask-user] answer -> new round session={} askId={} auto={} answerLen={}",
            sessionKey, askId, auto, answer == null ? 0 : answer.length());
        return true;
    }

    /** 连续 auto 是否已达上限（过期视为归零） */
    private boolean autoStreakReached(String sessionKey) {
        AutoStreak streak = autoStreaks.get(sessionKey);
        if (streak == null) {
            return false;
        }
        synchronized (streak) {
            if (System.currentTimeMillis() - streak.updatedAt > AUTO_STREAK_TTL_MS) {
                autoStreaks.remove(sessionKey, streak);
                return false;
            }
            return streak.count >= Math.max(1, maxAutoAnswers);
        }
    }

    private void bumpAutoStreak(String sessionKey) {
        AutoStreak streak = autoStreaks.computeIfAbsent(sessionKey, k -> new AutoStreak());
        synchronized (streak) {
            streak.count += 1;
            streak.updatedAt = System.currentTimeMillis();
        }
    }
}
