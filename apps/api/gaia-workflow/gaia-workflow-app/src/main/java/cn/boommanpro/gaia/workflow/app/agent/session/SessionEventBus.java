package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 会话级事件总线 —— 多窗口 / 断线重连的基石。
 *
 * <p>一次后端自治运行的每个事件都会进这里：既追加到「事件缓冲」供后来订阅的窗口回放，
 * 又实时推给当前所有订阅者。这样：</p>
 * <ul>
 *   <li>同时打开多个窗口 → 各自订阅同一会话流，看到完全一致的进展</li>
 *   <li>中途加入 / 刷新页面 → 订阅时先回放最近事件 + 当前运行快照，立即接上</li>
 *   <li>所有窗口都关闭 → 后端运行照常继续，事件落缓冲，下次订阅再回放</li>
 * </ul>
 *
 * <p>事件与传输解耦：订阅者只是 {@link Subscriber}，由调用方决定怎么送出
 * （SSE / WebSocket / 轮询快照都可以）。</p>
 */
@Slf4j
@Component
public class SessionEventBus {

    /** 每个会话保留的最近事件条数（够新窗口「接上进度」即可，历史以 DB 消息为准） */
    private static final int BUFFER_CAP = 500;

    private final ConcurrentMap<String, Channel> channels = new ConcurrentHashMap<>();

    /** 可选录制器（agent.dev.record-events-dir 配置后装配）；录制失败不影响主链路 */
    private volatile SessionEventRecorder recorder;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setEventRecorder(SessionEventRecorder recorder) {
        this.recorder = recorder;
    }

    /** 订阅者：返回 false 表示连接已失效，总线会将其移除 */
    public interface Subscriber {
        boolean send(String type, JSONObject data);
    }

    /** 缓冲中的一条事件 */
    private static final class BufferedEvent {
        final String type;
        final JSONObject data;

        BufferedEvent(String type, JSONObject data) {
            this.type = type;
            this.data = data;
        }
    }

    /** 一个会话的独立频道 */
    private static final class Channel {
        final String key;
        final CopyOnWriteArrayList<Subscriber> subscribers = new CopyOnWriteArrayList<>();
        final List<BufferedEvent> buffer = new ArrayList<>();
        volatile JSONObject latestState = new JSONObject().set("status", "idle");
        volatile long lastActiveAt = System.currentTimeMillis();

        Channel(String key) {
            this.key = key;
        }
    }

    // ---------------- 发布 ----------------

    /**
     * 发布一条事件：更新运行快照 → 入缓冲 → 广播给所有订阅者。
     * 运行快照让新订阅者无需重放整段 token 流，直接拿到当前画面。
     */
    public void publish(String sessionKey, String type, JSONObject data) {
        if (sessionKey == null || sessionKey.isEmpty() || type == null) {
            return;
        }
        Channel channel = channel(sessionKey);
        channel.lastActiveAt = System.currentTimeMillis();
        // 快照与缓冲的写入串行化：run 线程与 controller 线程（startRun/stop）会并发发布
        synchronized (channel) {
            applyToSnapshot(channel, type, data);
            synchronized (channel.buffer) {
                channel.buffer.add(new BufferedEvent(type, data));
                if (channel.buffer.size() > BUFFER_CAP) {
                    channel.buffer.remove(0);
                }
            }
        }
        broadcast(channel, type, data);
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
     * 直接设置会话运行快照（不追加事件到缓冲，也不作为普通事件广播给后来者）。
     * 用于 run 开始 / 结束等状态跃迁。
     */
    public void setState(String sessionKey, JSONObject state) {
        if (sessionKey == null || sessionKey.isEmpty()) {
            return;
        }
        Channel channel = channel(sessionKey);
        channel.latestState = state;
        channel.lastActiveAt = System.currentTimeMillis();
        broadcast(channel, "run_state", state);
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
     * 订阅一个会话的事件流。
     *
     * <p>订阅建立时只回放「当前运行快照」（run_state）：
     * 历史消息由前端从 DB 重新加载，中间过程（token / tool_call）由快照
     * 直接给出当前画面，避免重放整段事件造成重复渲染。订阅建立后的实时事件照常推送。</p>
     *
     * @return 取消订阅的句柄
     */
    public Runnable subscribe(String sessionKey, Subscriber subscriber) {
        if (sessionKey == null || sessionKey.isEmpty() || subscriber == null) {
            return () -> { };
        }
        Channel channel = channel(sessionKey);
        // 回放快照（让订阅者立刻知道此刻进行到哪一步）
        if (!subscriber.send("run_state", channel.latestState)) {
            return () -> { };
        }
        channel.subscribers.add(subscriber);
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

    /** 惰性清掉「无订阅 + 长时间无活动」的空频道，避免内存泄漏 */
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

    private void broadcast(Channel channel, String type, JSONObject data) {
        for (Subscriber subscriber : channel.subscribers) {
            if (!subscriber.send(type, data)) {
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
                // 时间线里的工具条目同步回填结果（快照恢复时工具卡才有终态）
                JSONArray timeline = state.getJSONArray("timeline");
                if (timeline != null) {
                    for (int i = timeline.size() - 1; i >= 0; i--) {
                        JSONObject item = timeline.getJSONObject(i);
                        if ("tool".equals(item.getStr("kind")) && toolCallId != null
                            && toolCallId.equals(item.getStr("id"))) {
                            JSONObject call = item.getJSONObject("call");
                            if (call != null) {
                                call.set("result", payload != null && payload.length() > 600
                                    ? payload.substring(0, 600) : payload);
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
            case "done":
                state.set("status", "done");
                state.set("phase", "done");
                break;
            case "error":
                state.set("status", "error");
                state.set("phase", "error");
                state.set("error", data.getStr("message", ""));
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
            default:
                // document / ui_action / plan 等不影响运行快照，只进缓冲与实时广播
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
