package cn.boommanpro.gaia.workflow.app.agent.event;

import cn.boommanpro.gaia.workflow.app.agent.session.SessionEventBus;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Iterator;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * SSE 连接的异步写出器 —— 「发布永不阻塞、慢客户端不拖垮 run 线程」的传输底座。
 *
 * <p>每个 SSE 连接持有：</p>
 * <ul>
 *   <li>一个<b>有界</b>帧队列（{@link #QUEUE_CAPACITY}）：总线发布只做入队（O(1)、非阻塞），
 *       绝不在 run 线程上等待网络写；</li>
 *   <li>一个<b>独立写出线程</b>：唯一触碰 {@link SseEmitter#send} 的线程（含心跳），
 *       天然串行、无线程安全问题；</li>
 *   <li><b>过载丢弃策略</b>：队列满时先回收「可丢帧」（token/thinking 流式增量 ——
 *       丢中间帧只是 UI 少几个字，下一帧即恢复）；结构帧（tool/plan/document/done…）
 *       仍无法入队才判定为死慢连接，主动断开（前端会带 Last-Event-ID 重连续传）。</li>
 * </ul>
 *
 * <p>SSE 帧 {@code id} 携带事件 seq，配合前端 Last-Event-ID 重放实现断线不丢不重。</p>
 */
@Slf4j
public final class SseStreamWriter implements SessionEventBus.Subscriber {

    /** 每连接帧队列容量（结构事件为准入度：正常会话远用不满） */
    private static final int QUEUE_CAPACITY = 1024;

    /** 单条流式增量超过该长度视为洪峰，直接丢帧不再排队 */
    private static final int MAX_FRAME_CHARS = 512 * 1024;

    private static final int KIND_EVENT = 0;
    private static final int KIND_PING = 1;
    private static final int KIND_CLOSE = 2;

    private static final class Frame {
        final int kind;
        final long seq;
        final String type;
        final JSONObject data;
        final boolean droppable;

        Frame(int kind, long seq, String type, JSONObject data, boolean droppable) {
            this.kind = kind;
            this.seq = seq;
            this.type = type;
            this.data = data;
            this.droppable = droppable;
        }
    }

    private final SseEmitter emitter;
    private final BlockingQueue<Frame> queue = new ArrayBlockingQueue<>(QUEUE_CAPACITY);
    private final Thread worker;
    private volatile boolean closed;

    public SseStreamWriter(SseEmitter emitter, String name) {
        this.emitter = emitter;
        this.worker = new Thread(this::run, "sse-writer-" + (name == null ? "?" : name));
        this.worker.setDaemon(true);
        this.worker.start();
    }

    /** 总线发布入口：仅入队。返回 false = 连接已死，总线会移除该订阅者 */
    @Override
    public boolean send(long seq, String type, JSONObject data) {
        if (closed) {
            return false;
        }
        if (data != null && data.toString().length() > MAX_FRAME_CHARS) {
            // 异常大的帧（失控工具结果等）：截断保连接，同时保留可诊断标记
            JSONObject trimmed = new JSONObject().set("oversized", true)
                .set("type", type).set("chars", data.toString().length());
            data = trimmed;
        }
        Frame frame = new Frame(KIND_EVENT, seq, type, data, isDroppable(type));
        if (!enqueue(frame)) {
            return false;
        }
        return true;
    }

    /** 心跳（comment 帧）：由调用方的调度器触发，同样只入队 */
    public void ping() {
        if (!closed) {
            queue.offer(new Frame(KIND_PING, 0, null, null, true));
        }
    }

    /** 关闭：唤醒写出线程 → emitter.complete()（幂等） */
    public void close() {
        if (closed) {
            return;
        }
        closed = true;
        queue.offer(new Frame(KIND_CLOSE, 0, null, null, false));
    }

    private void run() {
        try {
            while (true) {
                Frame frame = queue.poll(120, TimeUnit.SECONDS);
                if (frame == null) {
                    continue;
                }
                if (frame.kind == KIND_CLOSE) {
                    break;
                }
                if (frame.kind == KIND_PING) {
                    emitter.send(SseEmitter.event().comment("ping"));
                } else {
                    emitter.send(SseEmitter.event()
                        .id(Long.toString(frame.seq))
                        .name(frame.type)
                        .data(frame.data != null ? frame.data.toString() : "{}"));
                }
            }
        } catch (Throwable e) {
            // 连接断开 / 写超时：正常结束路径，交给 onCompletion 清理
            log.debug("[sse-writer] connection closed: {}", String.valueOf(e.getMessage()));
        } finally {
            closed = true;
            try {
                emitter.complete();
            } catch (Exception ignored) {
                // 已完成/已断开时的重复 complete 忽略
            }
        }
    }

    private boolean enqueue(Frame frame) {
        if (queue.offer(frame)) {
            return true;
        }
        // 满载：先回收可丢帧（流式增量）给结构帧腾位
        int recycled = recycleDroppable();
        if (recycled > 0 && queue.offer(frame)) {
            return true;
        }
        // 结构帧都无法入队：死慢连接，断开（前端将带 Last-Event-ID 重连）
        log.warn("[sse-writer] queue overflow with structural frames, dropping connection");
        close();
        return false;
    }

    /** 从队列中移除可丢帧（token/thinking），返回移除数 */
    private int recycleDroppable() {
        int removed = 0;
        Iterator<Frame> it = queue.iterator();
        while (it.hasNext()) {
            if (it.next().droppable) {
                it.remove();
                removed++;
            }
        }
        return removed;
    }

    /** 高频流式增量可丢（丢了只是少几个字，下一帧恢复）；结构性事件必须送达 */
    private static boolean isDroppable(String type) {
        return "token".equals(type) || "thinking".equals(type);
    }
}
