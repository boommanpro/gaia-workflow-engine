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
                break;
            }
            case "tool_result": {
                JSONArray calls = state.getJSONArray("toolCalls");
                if (calls == null) {
                    break;
                }
                String toolCallId = data.getStr("toolCallId");
                for (int i = 0; i < calls.size(); i++) {
                    JSONObject entry = calls.getJSONObject(i);
                    if (toolCallId != null && toolCallId.equals(entry.getStr("id"))) {
                        entry.set("status", "done");
                        entry.set("rejected", data.getBool("rejected", false));
                        entry.set("result", data.getStr("payload", ""));
                        break;
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
            default:
                // document / ui_action / plan 等不影响运行快照，只进缓冲与实时广播
                break;
        }
    }
}
