package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * 会话级事件总线 —— 多窗口 / 断线重连的基石。
 *
 * <p>一次后端自治运行的每个事件都会进这里：既分配单调递增的 {@code seq} 追加到
 * 「事件缓冲」供断线重连按 Last-Event-ID 精确重放，又实时推给当前所有订阅者：</p>
 * <ul>
 *   <li>同时打开多个窗口 → 各自订阅同一会话流，看到完全一致的进展</li>
 *   <li>断线重连（带 Last-Event-ID 且缓冲覆盖）→ 精确重放缺失事件，不丢不重</li>
 *   <li>新窗口 / 缓冲覆盖不到的连接 → 回放「当前运行快照」（run_state，含快照序号）</li>
 *   <li>所有窗口都关闭 → 后端运行照常继续，事件落缓冲，下次订阅再重放</li>
 * </ul>
 *
 * <p>事件与传输解耦：订阅者只是 {@link Subscriber}（拿到 seq），由调用方决定怎么送出
 * （{@code SseStreamWriter} 为每个连接提供有界队列 + 独立写出线程，发布永不阻塞）。</p>
 */
@Slf4j
@Component
public class SessionEventBus {

    /** 每个会话保留的最近事件条数（够重连窗口「接上进度」即可，历史以 DB 消息为准） */
    private static final int BUFFER_CAP = 500;

    /** 空闲频道回收：无订阅者且超过该时长无活动的频道整体丢弃（防内存泄漏） */
    private static final long PRUNE_IDLE_MILLIS = TimeUnit.MINUTES.toMillis(30);

    private final ConcurrentHashMap<String, Channel> channels = new ConcurrentHashMap<>();

    /** 可选录制器（agent.dev.record-events-dir 配置后装配）；录制失败不影响主链路 */
    private volatile SessionEventRecorder recorder;

    /** 频道回收调度器（守护线程，低频） */
    private ScheduledExecutorService pruner;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setEventRecorder(SessionEventRecorder recorder) {
        this.recorder = recorder;
    }

    @PostConstruct
    public void start() {
        pruner = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "event-bus-pruner");
            t.setDaemon(true);
            return t;
        });
        pruner.scheduleWithFixedDelay(() -> {
            try {
                pruneIdle(PRUNE_IDLE_MILLIS);
            } catch (Exception e) {
                log.debug("[event-bus] prune failed (ignored): {}", e.getMessage());
            }
        }, 5, 5, TimeUnit.MINUTES);
    }

    @PreDestroy
    public void stop() {
        if (pruner != null) {
            pruner.shutdownNow();
        }
    }

    /** 订阅者：返回 false 表示连接已失效，总线会将其移除 */
    public interface Subscriber {
        boolean send(long seq, String type, JSONObject data);
    }

    /** 缓冲中的一条事件 */
    private static final class BufferedEvent {
        final long seq;
        final String type;
        final JSONObject data;

        BufferedEvent(long seq, String type, JSONObject data) {
            this.seq = seq;
            this.type = type;
            this.data = data;
        }
    }

    /** 一个会话的独立频道（seq 分配 / 快照 / 缓冲的全部变更都在 channel 锁内完成） */
    private static final class Channel {
        final String key;
        final CopyOnWriteArrayList<Subscriber> subscribers = new CopyOnWriteArrayList<>();
        /** 事件缓冲（含 seq）；队列首元素即最旧保留事件 */
        final ArrayDeque<BufferedEvent> buffer = new ArrayDeque<>();
        /** 已分配的最大事件序号（0 = 尚无事件） */
        long seq = 0;
        volatile JSONObject latestState = new JSONObject().set("status", "idle");
        volatile long lastActiveAt = System.currentTimeMillis();

        Channel(String key) {
            this.key = key;
        }
    }

    // ---------------- 发布 ----------------

    /**
     * 发布一条事件：分配 seq → 更新运行快照 → 入缓冲 → 广播给所有订阅者。
     * 订阅者的 send 只是入队（见 SseStreamWriter），本方法不会因慢客户端而阻塞。
     */
    public void publish(String sessionKey, String type, JSONObject data) {
        if (sessionKey == null || sessionKey.isEmpty() || type == null) {
            return;
        }
        Channel channel = channel(sessionKey);
        channel.lastActiveAt = System.currentTimeMillis();
        long seq;
        synchronized (channel) {
            seq = ++channel.seq;
            applyToSnapshot(channel, type, data);
            channel.buffer.addLast(new BufferedEvent(seq, type, data));
            while (channel.buffer.size() > BUFFER_CAP) {
                channel.buffer.removeFirst();
            }
        }
        broadcast(channel, seq, type, data);
        SessionEventRecorder sink = recorder;
        if (sink != null) {
            try {
                sink.record(sessionKey, type, data);
            } catch (Exception e) {
                log.debug("[event-bus] recorder failed (ignored): {}", e.getMessage());
            }
        }
    }

    /**
     * 直接设置会话运行快照（不作为普通事件入缓冲）。用于 run 开始 / 结束等状态跃迁；
     * 广播时同样分配 seq，前端按 seq 单调性对齐现场。
     */
    public void setState(String sessionKey, JSONObject state) {
        if (sessionKey == null || sessionKey.isEmpty() || state == null) {
            return;
        }
        Channel channel = channel(sessionKey);
        channel.lastActiveAt = System.currentTimeMillis();
        long seq;
        synchronized (channel) {
            seq = ++channel.seq;
            channel.latestState = state;
        }
        broadcast(channel, seq, "run_state", state);
    }

    /** 读取当前快照（轮询兜底 / 初始渲染用） */
    public JSONObject getState(String sessionKey) {
        if (sessionKey == null || sessionKey.isEmpty()) {
            return new JSONObject().set("status", "idle");
        }
        Channel channel = channels.get(sessionKey);
        return channel != null ? channel.latestState : new JSONObject().set("status", "idle");
    }

    /** 该会话当前是否有在线订阅窗口（confirm require 模式据此决定是否等待用户） */
    public boolean hasSubscribers(String sessionKey) {
        if (sessionKey == null || sessionKey.isEmpty()) {
            return false;
        }
        Channel channel = channels.get(sessionKey);
        return channel != null && !channel.subscribers.isEmpty();
    }

    // ---------------- 订阅 ----------------

    /**
     * 订阅一个会话的事件流（带断线续传）。
     *
     * <p>连接语义按 {@code lastEventId} 分两档：</p>
     * <ul>
     *   <li><b>重连且缓冲覆盖</b>（lastEventId &ge; 缓冲最旧 seq - 1）：
     *       精确重放 seq &gt; lastEventId 的缓冲事件 —— 前端按 seq 去重，不丢不重；</li>
     *   <li><b>新窗口 / 缓冲覆盖不到</b>：回放一条 run_state 快照（内嵌当前 seq），
     *       历史消息由前端从 DB 加载，中间过程（token / tool_call）由快照直接给出当前画面。</li>
     * </ul>
     *
     * <p>初始帧的投递与订阅注册同在 channel 锁内完成，保证与后续实时事件严格有序。</p>
     *
     * @return 取消订阅的句柄
     */
    public Runnable subscribe(String sessionKey, Long lastEventId, Subscriber subscriber) {
        if (sessionKey == null || sessionKey.isEmpty() || subscriber == null) {
            return () -> { };
        }
        Channel channel = channel(sessionKey);
        List<BufferedEvent> replay = null;
        JSONObject snapshot = null;
        synchronized (channel) {
            if (lastEventId != null && !channel.buffer.isEmpty()
                && channel.buffer.peekFirst().seq <= lastEventId + 1) {
                replay = new ArrayList<>();
                for (BufferedEvent event : channel.buffer) {
                    if (event.seq > lastEventId) {
                        replay.add(event);
                    }
                }
            } else {
                // 快照带当前 seq：前端据此校准续传游标（后续事件 seq 必然更大）
                snapshot = new JSONObject(channel.latestState.toString());
            }
            channel.subscribers.add(subscriber);
            // 仍在锁内投递初始帧：实时广播无法插队，帧序严格单调
            boolean alive = true;
            if (snapshot != null) {
                alive = subscriber.send(channel.seq, "run_state", snapshot);
            } else {
                for (BufferedEvent event : replay) {
                    if (!subscriber.send(event.seq, event.type, event.data)) {
                        alive = false;
                        break;
                    }
                }
            }
            if (!alive) {
                channel.subscribers.remove(subscriber);
                return () -> { };
            }
        }
        return () -> channel.subscribers.remove(subscriber);
    }

    /** 移除一个已失效的订阅者（连接断开时调用） */
    public void unsubscribe(String sessionKey, Subscriber subscriber) {
        if (sessionKey == null || subscriber == null) {
            return;
        }
        Channel channel = channels.get(sessionKey);
        if (channel != null) {
            channel.subscribers.remove(subscriber);
        }
    }

    /** 清掉「无订阅 + 长时间无活动」的空频道，避免内存泄漏 */
    public void pruneIdle(long idleMillis) {
        long now = System.currentTimeMillis();
        channels.forEach((key, channel) -> {
            if (channel.subscribers.isEmpty() && now - channel.lastActiveAt > idleMillis) {
                channels.remove(key, channel);
            }
        });
    }

    // ---------------- 内部 ----------------

    private Channel channel(String sessionKey) {
        return channels.computeIfAbsent(sessionKey, Channel::new);
    }

    private void broadcast(Channel channel, long seq, String type, JSONObject data) {
        for (Subscriber subscriber : channel.subscribers) {
            if (!subscriber.send(seq, type, data)) {
                channel.subscribers.remove(subscriber);
            }
        }
    }

    /** 快照时间线条目上限（防超长 run 把快照撑爆；头部丢弃） */
    private static final int SNAPSHOT_TIMELINE_CAP = 200;

    /** 事件流反哺「当前运行快照」，让新订阅者拿到此刻画面而不是从头回放 */
    private void applyToSnapshot(Channel channel, String type, JSONObject data) {
        JSONObject state = channel.latestState;
        switch (type) {
            case "turn": {
                state.set("status", "running");
                state.set("phase", "llm");
                state.set("turn", data.getInt("turn", 1));
                state.set("assistantContent", "");
                state.set("toolCalls", new JSONArray());
                // 新 turn = 上一条提问已出结果（作答/超时/中断），不再挂起
                state.set("pendingAsk", null);
                break;
            }
            case "token": {
                state.set("phase", "llm");
                String content = data.getStr("content", "");
                String existing = state.getStr("assistantContent", "");
                state.set("assistantContent", existing + content);
                appendTimeline(state, "text", content);
                break;
            }
            case "thinking": {
                String chunk = data.getStr("content", "");
                String existing = state.getStr("thinking", "");
                state.set("thinking", existing + chunk);
                appendTimeline(state, "thinking", chunk);
                break;
            }
            case "tool_call": {
                state.set("phase", "tools");
                JSONArray calls = state.getJSONArray("toolCalls");
                if (calls == null) {
                    calls = new JSONArray();
                    state.set("toolCalls", calls);
                }
                JSONObject entry = new JSONObject()
                    .set("id", data.getStr("id"))
                    .set("name", data.getStr("name"))
                    .set("args", data.get("args"))
                    .set("status", "running");
                calls.add(entry);
                appendTimelineTool(state, entry);
                break;
            }
            case "tool_result": {
                JSONArray calls = state.getJSONArray("toolCalls");
                String toolCallId = data.getStr("toolCallId");
                String payload = data.getStr("payload", "");
                if (calls != null) {
                    for (int i = 0; i < calls.size(); i++) {
                        JSONObject entry = calls.getJSONObject(i);
                        if (toolCallId != null && toolCallId.equals(entry.getStr("id"))) {
                            entry.set("status", "done");
                            entry.set("rejected", data.getBool("rejected", false));
                            entry.set("result", payload);
                            break;
                        }
                    }
                }
                // 时间线里的工具条目同步回填结果（快照恢复时工具卡才有终态）——
                // 全量不截断：半截 JSON 会让前端解析落入「结果被截断」兜底，排障失真
                JSONArray timeline = state.getJSONArray("timeline");
                if (timeline != null) {
                    for (int i = timeline.size() - 1; i >= 0; i--) {
                        JSONObject item = timeline.getJSONObject(i);
                        if ("tool".equals(item.getStr("kind")) && toolCallId != null
                            && toolCallId.equals(item.getStr("id"))) {
                            JSONObject call = item.getJSONObject("call");
                            if (call != null) {
                                call.set("result", payload != null ? payload : "");
                            }
                            break;
                        }
                    }
                }
                break;
            }
            case "repeat_reminder":
            case "wrap_up":
            case "llm_retry":
            case "interrupted": {
                // 护栏/韧性事件进时间线：刷新/重连后用户能看到"为什么停、为什么重试"
                String text = data.getStr("message", "");
                if (text == null || text.isEmpty()) {
                    text = data.getStr("content", "");
                }
                if (text == null || text.isEmpty()) {
                    text = "系统提示：" + type;
                }
                appendTimelineNotice(state, type, text);
                break;
            }
            case "artifact": {
                // 产物事件反哺快照：新订阅窗口无需等 GET /artifacts 就能拿到最新产物画面
                if ("upsert".equals(data.getStr("action"))) {
                    JSONObject artifact = data.getJSONObject("artifact");
                    if (artifact != null && artifact.getStr("artifactKey") != null) {
                        JSONArray list = state.getJSONArray("artifacts");
                        if (list == null) {
                            list = new JSONArray();
                            state.set("artifacts", list);
                        }
                        String key = artifact.getStr("artifactKey");
                        for (int i = 0; i < list.size(); i++) {
                            JSONObject entry = list.getJSONObject(i);
                            if (key.equals(entry.getStr("artifactKey"))) {
                                list.remove(i);
                                break;
                            }
                        }
                        list.add(artifact);
                        while (list.size() > 10) {
                            list.remove(0);
                        }
                    }
                } else if ("state".equals(data.getStr("action"))) {
                    JSONArray list = state.getJSONArray("artifacts");
                    String key = data.getStr("artifactKey");
                    if (list != null && key != null) {
                        for (int i = 0; i < list.size(); i++) {
                            JSONObject entry = list.getJSONObject(i);
                            if (key.equals(entry.getStr("artifactKey"))) {
                                entry.set("status", data.getStr("status"));
                                break;
                            }
                        }
                    }
                }
                break;
            }
            case "document": {
                // 画布版本反哺快照：新窗口据此知道自己手里的 doc 版本是否落后
                Long version = data.getLong("version");
                if (version != null) {
                    state.set("docVersion", version);
                }
                break;
            }
            case "done":
                state.set("status", "done");
                state.set("phase", "done");
                state.set("pendingAsk", null);
                break;
            case "error":
                state.set("status", "error");
                state.set("phase", "error");
                state.set("error", data.getStr("message", ""));
                state.set("pendingAsk", null);
                break;
            case "confirm_request": {
                // 待确认状态反哺快照：窗口刷新 / SSE 断线重连后，确认卡能从
                // run_state 回放里恢复，而不是永远丢掉（后端还在挂起等待）。
                if ("require".equals(data.getStr("mode"))) {
                    state.set("pendingConfirm", new JSONObject()
                        .set("toolCallId", data.getStr("toolCallId"))
                        .set("action", data.getStr("action"))
                        .set("args", data.get("args"))
                        .set("mode", "require"));
                }
                break;
            }
            case "confirm_resolved": {
                JSONObject pending = state.getJSONObject("pendingConfirm");
                if (pending != null && pending.getStr("toolCallId").equals(data.getStr("toolCallId"))) {
                    state.set("pendingConfirm", null);
                }
                break;
            }
            case "ask_request": {
                // 挂起提问反哺快照：窗口刷新 / SSE 断线重连后，提问卡能从
                // run_state 回放里恢复（后端还在等待这个回答），而不是永久丢失。
                if (data.getStr("askId") != null) {
                    state.set("pendingAsk", data);
                }
                break;
            }
            case "ask_resolved": {
                JSONObject pendingAsk = state.getJSONObject("pendingAsk");
                if (pendingAsk != null && pendingAsk.getStr("askId").equals(data.getStr("askId"))) {
                    state.set("pendingAsk", null);
                }
                break;
            }
            default:
                // ui_action / plan 等不影响运行快照，只进缓冲与实时广播
                break;
        }
    }

    // ---------------- 快照时间线（刷新/重连后重建交错画面的依据） ----------------

    /** 追加文本/思考类时间线条目（相邻同 kind 续写，与前端 live 行为一致） */
    private void appendTimeline(JSONObject state, String kind, String text) {
        if (text == null || text.isEmpty()) {
            return;
        }
        JSONArray timeline = state.getJSONArray("timeline");
        if (timeline == null) {
            timeline = new JSONArray();
            state.set("timeline", timeline);
        }
        if (!timeline.isEmpty()) {
            JSONObject last = timeline.getJSONObject(timeline.size() - 1);
            if (kind.equals(last.getStr("kind")) && last.containsKey("text")) {
                last.set("text", last.getStr("text", "") + text);
                return;
            }
        }
        timeline.add(new JSONObject()
            .set("kind", kind)
            .set("id", "snap-" + kind + "-" + timeline.size())
            .set("text", text));
        capTimeline(timeline);
    }

    /** 追加工具类时间线条目（call 对象与 toolCalls 数组里的条目同引用，tool_result 一处回填两处生效） */
    private void appendTimelineTool(JSONObject state, JSONObject callEntry) {
        JSONArray timeline = state.getJSONArray("timeline");
        if (timeline == null) {
            timeline = new JSONArray();
            state.set("timeline", timeline);
        }
        JSONObject item = new JSONObject()
            .set("kind", "tool")
            .set("id", callEntry.getStr("id"))
            .set("call", callEntry);
        timeline.add(item);
        capTimeline(timeline);
    }

    /** 追加系统通知（护栏/重试/中断） */
    private void appendTimelineNotice(JSONObject state, String source, String text) {
        JSONArray timeline = state.getJSONArray("timeline");
        if (timeline == null) {
            timeline = new JSONArray();
            state.set("timeline", timeline);
        }
        timeline.add(new JSONObject()
            .set("kind", "notice")
            .set("id", "snap-notice-" + timeline.size())
            .set("source", source)
            .set("text", text));
        capTimeline(timeline);
    }

    private void capTimeline(JSONArray timeline) {
        while (timeline.size() > SNAPSHOT_TIMELINE_CAP) {
            timeline.remove(0);
        }
    }
}
