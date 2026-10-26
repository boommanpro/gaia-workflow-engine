package cn.boommanpro.gaia.workflow.app.agent.event;

import cn.boommanpro.gaia.workflow.app.agent.session.AgentSessionRunService;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionEventBus;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * 把一次后端自治运行的事件路由进 {@link SessionEventBus} 的输出端。
 *
 * <p>与旧的 {@link SseAgentEventSink} 不同：它不直接绑某个 SSE 连接，
 * 而是把事件交给会话事件总线 —— 总线负责缓冲 + 多窗口广播 + 新订阅者回放。
 * 因此「没有任何窗口在场」时运行依然完整推进，事件只是暂存在缓冲里。</p>
 *
 * <p><b>流式增量合帧</b>：token / thinking 逐字事件先进入段缓冲，按
 * {@value #FLUSH_INTERVAL_MS}ms 窗口合并成帧再发布（网络帧率从「每 token 一帧」
 * 降到 ≤25 帧/秒）。任何结构事件到达时先冲刷缓冲，保证时间线顺序与逐 token
 * 发布完全一致。</p>
 *
 * <p>同时尊重运行句柄的取消标记：用户点了停止后，后续事件不再进总线，
 * 让已停止的运行不会继续污染会话视图。</p>
 */
@Slf4j
public class BusAgentEventSink implements AgentEventSink {

    /** 流式增量的合帧窗口（毫秒）：25 帧/秒的上限，肉眼无感、网络与序列化成本骤降 */
    private static final long FLUSH_INTERVAL_MS = 40;

    /** 缓冲超过该字符量立即冲刷（防定时器漂移时的超长帧） */
    private static final int FLUSH_SIZE_THRESHOLD = 16 * 1024;

    /** 合帧调度器：全局单线程守护（每次 run 一个延迟任务，负载极低） */
    private static final ScheduledExecutorService FLUSHER = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "agent-token-flusher");
        t.setDaemon(true);
        return t;
    });

    /** 一段待冲刷的流式增量（同 kind 连续追加；异类新开一段，保持真实交错顺序） */
    private static final class Segment {
        final String type;
        final StringBuilder text = new StringBuilder();

        Segment(String type) {
            this.type = type;
        }
    }

    private final String sessionKey;
    private final SessionEventBus eventBus;
    private final AgentSessionRunService.RunHandle handle;

    private final Object lock = new Object();
    private final ArrayDeque<Segment> segments = new ArrayDeque<>();
    private ScheduledFuture<?> flushTask;
    private int bufferedChars;

    public BusAgentEventSink(String sessionKey, SessionEventBus eventBus,
                             AgentSessionRunService.RunHandle handle) {
        this.sessionKey = sessionKey;
        this.eventBus = eventBus;
        this.handle = handle;
    }

    @Override
    public void emit(AgentEvent event) {
        if (event == null || !isActive()) {
            return;
        }
        String type = event.getType();
        if ("token".equals(type) || "thinking".equals(type)) {
            String content = event.getData() != null ? event.getData().getStr("content", "") : "";
            if (content == null || content.isEmpty()) {
                return;
            }
            boolean flushNow = false;
            synchronized (lock) {
                Segment last = segments.peekLast();
                if (last == null || !last.type.equals(type)) {
                    last = new Segment(type);
                    segments.addLast(last);
                }
                last.text.append(content);
                bufferedChars += content.length();
                if (flushTask == null) {
                    flushTask = FLUSHER.schedule(this::flush, FLUSH_INTERVAL_MS, TimeUnit.MILLISECONDS);
                }
                flushNow = bufferedChars >= FLUSH_SIZE_THRESHOLD;
            }
            if (flushNow) {
                flush();
            }
            return;
        }
        // 结构事件：先冲刷流式缓冲（时间线上流式内容永远在其触发者之前），再发布本体
        flush();
        eventBus.publish(sessionKey, type,
            event.getData() != null ? event.getData() : new cn.hutool.json.JSONObject());
    }

    /** 冲刷全部待发段（幂等；运行已取消时缓冲直接丢弃） */
    private void flush() {
        List<Segment> pending;
        synchronized (lock) {
            if (segments.isEmpty()) {
                cancelTask();
                return;
            }
            pending = new ArrayList<>(segments);
            segments.clear();
            bufferedChars = 0;
            cancelTask();
        }
        if (!isActive()) {
            return;
        }
        for (Segment segment : pending) {
            eventBus.publish(sessionKey, segment.type,
                new cn.hutool.json.JSONObject().set("content", segment.text.toString()));
        }
    }

    private void cancelTask() {
        if (flushTask != null) {
            flushTask.cancel(false);
            flushTask = null;
        }
    }

    @Override
    public boolean isActive() {
        return handle == null || !handle.isCancelled();
    }
}
