package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSession;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSessionEvent;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionEventService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 运行日志录制器 —— 会话审查「调用日志」的数据生产端 + 持久事件日志（v2）。
 *
 * <p>双写职责：</p>
 * <ol>
 *   <li><b>debug_data</b>（旧行为保留）：run 结束后合并写入 {@code agent_session.debug_data}，
 *       与前端调试面板的 DebugEntry 结构兼容；</li>
 *   <li><b>agent_session_event</b>（v2 新增，对齐 dsh durable session log）：结构化事件
 *       （turn/llm_end/tool_call/tool_result/confirm/document/plan/knowledge_retrieved/error）
 *       按序落表，追加只写，供回放调试与指标统计。token/thinking 等高频流事件不入表。</li>
 * </ol>
 *
 * <p>记录永远不能影响主链路：录制异常一律吞掉。</p>
 */
@Slf4j
public class ToolLogRecorder implements AgentEventSink {

    /** debug_data 里最多保留的条目数（与前端防抖回写的上限一致） */
    private static final int MAX_ENTRIES = 50;
    private static final int MAX_ARGS_CHARS = 400;
    private static final int MAX_RESULT_CHARS = 800;
    /** 持久事件的 payload 截断上限 */
    private static final int MAX_EVENT_PAYLOAD_CHARS = 4000;

    private final AgentEventSink delegate;
    private final AgentSessionService sessionService;
    private final AgentSessionEventService eventService;
    private final String runId;
    private final String eventSessionKey;
    /** 触发本次 run 的用户消息（作为条目标题，方便审查列表定位） */
    private final String userMessage;
    private final long startedAt = System.currentTimeMillis();

    private final List<JSONObject> entries = new ArrayList<>();
    /** 当前 LLM 轮次对应的条目（turn / llm_end 事件推进） */
    private JSONObject current;
    private int seq = 0;
    /** 持久事件序号（run 内递增） */
    private int eventSeq = 0;
    /** callId → 本次 run 内已见的调用（tool_call 时登记，tool_result 时补全） */
    private final Map<String, JSONObject> openCalls = new HashMap<>();

    public ToolLogRecorder(AgentEventSink delegate, AgentSessionService sessionService, String userMessage) {
        this(delegate, sessionService, null, null, null, userMessage);
    }

    public ToolLogRecorder(AgentEventSink delegate, AgentSessionService sessionService,
                           AgentSessionEventService eventService, String runId,
                           String eventSessionKey, String userMessage) {
        this.delegate = delegate;
        this.sessionService = sessionService;
        this.eventService = eventService;
        this.runId = runId;
        this.eventSessionKey = eventSessionKey;
        this.userMessage = userMessage;
    }

    @Override
    public void emit(AgentEvent event) {
        delegate.emit(event);
        try {
            record(event);
        } catch (Exception e) {
            log.debug("[tool-log] record failed (ignored): {}", e.getMessage());
        }
        try {
            persistEvent(event);
        } catch (Exception e) {
            log.debug("[tool-log] event persist failed (ignored): {}", e.getMessage());
        }
    }

    @Override
    public boolean isActive() {
        return delegate.isActive();
    }

    // ---------------- 持久事件日志（v2） ----------------

    private void persistEvent(AgentEvent event) {
        if (eventService == null || event == null || event.getType() == null) {
            return;
        }
        String type = event.getType();
        // 高频流事件不入表（token 每秒几十条，落表只有噪声）
        if ("token".equals(type) || "thinking".equals(type)) {
            return;
        }
        String sessionKey = eventSessionKey;
        if (sessionKey == null || sessionKey.isEmpty()) {
            return;
        }
        AgentSessionEvent row = new AgentSessionEvent();
        row.setSessionKey(sessionKey);
        row.setRunId(runId);
        row.setSeq(++eventSeq);
        row.setEventType(type);
        String payload = event.getData() != null ? event.getData().toString() : null;
        row.setPayload(payload != null && payload.length() > MAX_EVENT_PAYLOAD_CHARS
            ? payload.substring(0, MAX_EVENT_PAYLOAD_CHARS) + "…(truncated)" : payload);
        row.setCreatedAt(java.time.LocalDateTime.now().toString());
        eventService.save(row);
    }

    // ---------------- debug_data 录制（原有行为） ----------------

    private synchronized void record(AgentEvent event) {
        String type = event.getType();
        JSONObject data = event.getData() != null ? event.getData() : new JSONObject();
        switch (type == null ? "" : type) {
            case "turn":
                // 新一轮开始：上一轮条目（LLM 元数据 + 它触发的工具调用）在此收口
                if (current != null && hasContent(current)) {
                    entries.add(current);
                    current = null;
                }
                ensureCurrent();
                current.set("turn", data.getInt("turn"));
                break;
            case "llm_end": {
                ensureCurrent();
                // JSONArray.add() 返回 boolean，必须先构造再 add，禁止内联进 set()
                JSONArray requestMessages = new JSONArray();
                requestMessages.add(new JSONObject()
                    .set("role", "user")
                    .set("content", userMessage));
                current.set("request", new JSONObject()
                    .set("model", data.getStr("model"))
                    .set("temperature", data.getStr("temperature"))
                    .set("messagesCount", data.getInt("messagesCount"))
                    .set("toolsCount", data.getInt("toolsCount"))
                    .set("messages", requestMessages));
                current.set("response", new JSONObject()
                    .set("durationMs", data.getLong("durationMs"))
                    .set("contentLength", data.getInt("contentLength"))
                    .set("thinkingLength", data.getInt("thinkingLength"))
                    .set("toolCallsCount", data.getJSONArray("toolCalls") != null
                        ? data.getJSONArray("toolCalls").size() : 0)
                    .set("toolCalls", trimToolCalls(data.getJSONArray("toolCalls"))));
                break;
            }
            case "tool_call": {
                ensureCurrent();
                JSONObject call = new JSONObject()
                    .set("toolCallId", data.getStr("id"))
                    .set("name", data.getStr("name"))
                    .set("args", trim(data.getStr("args"), MAX_ARGS_CHARS))
                    .set("at", System.currentTimeMillis());
                openCalls.put(data.getStr("id"), call);
                JSONObject request = current.getJSONObject("request");
                JSONArray calls = request != null ? request.getJSONArray("invokedTools") : null;
                if (calls == null) {
                    calls = new JSONArray();
                    if (request != null) {
                        request.set("invokedTools", calls);
                    } else {
                        current.set("request", new JSONObject().set("invokedTools", calls));
                    }
                }
                calls.add(call);
                break;
            }
            case "tool_result": {
                ensureCurrent();
                String callId = data.getStr("toolCallId");
                JSONObject call = openCalls.get(callId);
                JSONObject item = new JSONObject()
                    .set("toolCallId", callId)
                    .set("name", call != null ? call.getStr("name") : data.getStr("name"))
                    .set("result", trim(data.getStr("payload"), MAX_RESULT_CHARS))
                    .set("rejected", Boolean.TRUE.equals(data.getBool("rejected")))
                    .set("durationMs", call != null ? System.currentTimeMillis() - call.getLong("at") : null);
                JSONObject toolResults = current.getJSONObject("toolResults");
                if (toolResults == null) {
                    toolResults = new JSONObject().set("count", 0).set("results", new JSONArray());
                    current.set("toolResults", toolResults);
                }
                toolResults.getJSONArray("results").add(item);
                toolResults.set("count", toolResults.getJSONArray("results").size());
                break;
            }
            case "error":
                ensureCurrent();
                current.set("error", new JSONObject().set("message", data.getStr("message")));
                break;
            default:
                break;
        }
    }

    private boolean hasContent(JSONObject entry) {
        return entry.getJSONObject("response") != null
            || entry.getJSONObject("request") != null
            || entry.getJSONObject("toolResults") != null;
    }

    private void ensureCurrent() {
        if (current == null) {
            seq++;
            current = new JSONObject()
                .set("id", "dbg-" + startedAt + "-" + seq)
                .set("timestamp", System.currentTimeMillis());
        }
    }

    private JSONArray trimToolCalls(JSONArray calls) {
        JSONArray trimmed = new JSONArray();
        if (calls == null) {
            return trimmed;
        }
        for (int i = 0; i < calls.size(); i++) {
            JSONObject call = calls.getJSONObject(i);
            if (call == null) {
                continue;
            }
            JSONObject fn = call.getJSONObject("function");
            trimmed.add(new JSONObject()
                .set("id", call.getStr("id"))
                .set("name", fn != null ? fn.getStr("name") : null)
                .set("arguments", fn != null ? trim(fn.getStr("arguments"), MAX_ARGS_CHARS) : null));
        }
        return trimmed;
    }

    private static String trim(String raw, int max) {
        if (raw == null) {
            return null;
        }
        return raw.length() > max ? raw.substring(0, max) + "…(truncated)" : raw;
    }

    /** run 结束后把本次录得的条目合并进 agent_session.debug_data（尾部截断保 50 条） */
    public synchronized void flush(String sessionKey) {
        try {
            if (current != null) {
                if (hasContent(current)) {
                    entries.add(current);
                }
                current = null;
            }
            if (entries.isEmpty() || sessionKey == null || sessionKey.isEmpty()) {
                return;
            }
            AgentSession session = sessionService.getOne(
                new QueryWrapper<AgentSession>().eq("session_key", sessionKey));
            if (session == null) {
                return;
            }
            JSONArray merged = new JSONArray();
            String existing = session.getDebugData();
            if (existing != null && !existing.trim().isEmpty()) {
                try {
                    Object parsed = JSONUtil.parse(existing);
                    if (parsed instanceof JSONArray) {
                        merged = (JSONArray) parsed;
                    } else if (parsed instanceof JSONObject
                        && ((JSONObject) parsed).getJSONArray("entries") != null) {
                        merged = ((JSONObject) parsed).getJSONArray("entries");
                    }
                } catch (Exception ignore) {
                    // 旧数据不可解析则放弃，只写本次条目
                }
            }
            for (JSONObject entry : entries) {
                merged.add(entry);
            }
            while (merged.size() > MAX_ENTRIES) {
                merged.remove(0);
            }
            session.setDebugData(merged.toString());
            session.setUpdatedAt(java.time.LocalDateTime.now());
            sessionService.updateById(session);
            log.info("[tool-log] session={} persisted {} debug entries (total {})",
                sessionKey, entries.size(), merged.size());
        } catch (Exception e) {
            log.warn("[tool-log] flush failed session={}: {}", sessionKey, e.getMessage());
        }
    }
}
