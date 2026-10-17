package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.app.agent.ass.AgentServiceClient;
import cn.boommanpro.gaia.workflow.app.agent.ass.AgentServiceSessionService;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionCompactionService;
import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.AgentProviderConfigService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentLlmCallLog;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSessionEvent;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolCallLog;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentLlmCallLogService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionEventService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolCallLogService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Agent 可观测性端点（v2）—— 成功率度量 + 事件回放。
 *
 * <ul>
 *   <li>{@code GET /api/agent/metrics/tools} — 按 工具×结局 聚合的调用量与耗时，
 *       含一次通过率（SUCCESS / 总数），金丝雀回归的数据口径；</li>
 *   <li>{@code GET /api/agent/metrics/sessions/{sessionKey}/runs/{runId}} — 单次 run 的事件回放
 *       （agent_session_event 按序），排查「模型当时看到了什么」；</li>
 *   <li>{@code GET /api/agent/metrics/sessions/{sessionKey}/as-service} — AgentScope Service
 *       远端会话快照代理（Service 控制台对应用创建的会话无浏览 UI，由本端点代理给
 *       Gaia Trajectory 的「Service 对话」视图）。</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/api/agent/metrics")
public class AgentObservabilityController {

    private final AgentToolCallLogService toolCallLogService;
    private final AgentSessionEventService sessionEventService;
    private final AgentLlmCallLogService llmCallLogService;
    private final AgentModelConfigService modelConfigService;
    private final AgentServiceSessionService asServiceSessionService;
    private final AgentServiceClient asServiceClient;
    private final AgentProviderConfigService providerConfigService;

    public AgentObservabilityController(AgentToolCallLogService toolCallLogService,
                                        AgentSessionEventService sessionEventService,
                                        AgentLlmCallLogService llmCallLogService,
                                        AgentModelConfigService modelConfigService,
                                        AgentServiceSessionService asServiceSessionService,
                                        AgentServiceClient asServiceClient,
                                        AgentProviderConfigService providerConfigService) {
        this.toolCallLogService = toolCallLogService;
        this.sessionEventService = sessionEventService;
        this.llmCallLogService = llmCallLogService;
        this.modelConfigService = modelConfigService;
        this.asServiceSessionService = asServiceSessionService;
        this.asServiceClient = asServiceClient;
        this.providerConfigService = providerConfigService;
    }

    /** 工具×结局 聚合（可选 days 限定最近 N 天，默认 7） */
    @GetMapping("/tools")
    public Map<String, Object> toolMetrics(@RequestParam(required = false, defaultValue = "7") int days) {
        List<AgentToolCallLog> rows = toolCallLogService.list(
            new QueryWrapper<AgentToolCallLog>()
                .ge("created_at", java.time.LocalDateTime.now().minusDays(Math.min(Math.max(days, 1), 90)).toString().substring(0, 19))
                .orderByDesc("id"));

        Map<String, JSONObject> perTool = new HashMap<>();
        long totalCalls = 0;
        long totalSuccess = 0;
        for (AgentToolCallLog row : rows) {
            JSONObject agg = perTool.computeIfAbsent(row.getToolName(), k -> new JSONObject()
                .set("tool", k)
                .set("total", 0L)
                .set("outcomes", new JSONObject())
                .set("avgDurationMs", 0L)
                .set("durationSum", 0L));
            agg.set("total", agg.getLong("total") + 1);
            JSONObject outcomes = agg.getJSONObject("outcomes");
            outcomes.set(row.getOutcome(), outcomes.getLong(row.getOutcome(), 0L) + 1);
            if (row.getDurationMs() != null) {
                agg.set("durationSum", agg.getLong("durationSum") + row.getDurationMs());
            }
            totalCalls++;
            if ("SUCCESS".equals(row.getOutcome())) {
                totalSuccess++;
            }
        }
        JSONArray tools = new JSONArray();
        for (JSONObject agg : perTool.values()) {
            long total = agg.getLong("total");
            if (total > 0) {
                agg.set("avgDurationMs", agg.getLong("durationSum") / total);
            }
            agg.remove("durationSum");
            JSONObject outcomes = agg.getJSONObject("outcomes");
            long success = outcomes.getLong("SUCCESS", 0L);
            agg.set("successRate", total > 0 ? Math.round(success * 1000.0 / total) / 10.0 : 0.0);
            tools.add(agg);
        }
        tools.sort((a, b) -> Long.compare(((JSONObject) b).getLong("total"), ((JSONObject) a).getLong("total")));

        JSONObject result = new JSONObject()
            .set("totalCalls", totalCalls)
            .set("overallSuccessRate", totalCalls > 0 ? Math.round(totalSuccess * 1000.0 / totalCalls) / 10.0 : 0.0)
            .set("tools", tools);
        return result;
    }

    /** 单 run 事件回放（排障：模型当时看到了什么、工具结果是什么） */
    @GetMapping("/sessions/{sessionKey}/runs/{runId}")
    public List<AgentSessionEvent> runEvents(@PathVariable String sessionKey, @PathVariable String runId) {
        return sessionEventService.list(
            new QueryWrapper<AgentSessionEvent>()
                .eq("session_key", sessionKey)
                .eq("run_id", runId)
                .orderByAsc("id"));
    }

    /** 会话全部事件（跨 run，最新在尾） */
    @GetMapping("/sessions/{sessionKey}/events")
    public List<AgentSessionEvent> sessionEvents(@PathVariable String sessionKey,
                                                 @RequestParam(required = false, defaultValue = "200") int limit) {
        return sessionEventService.list(
            new QueryWrapper<AgentSessionEvent>()
                .eq("session_key", sessionKey)
                .orderByDesc("id")
                .last("LIMIT " + Math.min(Math.max(limit, 1), 1000)));
    }

    /**
     * 会话的 run 列表（执行追踪页数据源）—— 从 agent_session_event 派生：
     * 每个 run 一行，含终态（run_end 的 outcome/失败链/时间账）、起止时间、事件数。
     * 无 run_end 事件的 run 判为 running/stalled（进程死亡或仍进行中，前端区分展示）。
     */
    @GetMapping("/sessions/{sessionKey}/runs")
    public List<Map<String, Object>> sessionRuns(@PathVariable String sessionKey,
                                                 @RequestParam(required = false, defaultValue = "200") int limit) {
        List<AgentSessionEvent> events = sessionEventService.list(
            new QueryWrapper<AgentSessionEvent>()
                .eq("session_key", sessionKey)
                .orderByAsc("id")
                .last("LIMIT " + Math.min(Math.max(limit, 1) * 20, 2000)));

        // 按 runId 聚合（保持首次出现顺序）
        Map<String, Map<String, Object>> runs = new LinkedHashMap<>();
        for (AgentSessionEvent event : events) {
            String runId = event.getRunId() != null ? event.getRunId() : "unknown";
            Map<String, Object> run = runs.computeIfAbsent(runId, k -> {
                Map<String, Object> m = new HashMap<>();
                m.put("runId", k);
                m.put("startedAt", event.getCreatedAt());
                m.put("eventCount", 0);
                m.put("hasError", false);
                return m;
            });
            run.put("eventCount", (Integer) run.get("eventCount") + 1);
            run.put("lastEventAt", event.getCreatedAt());
            String type = event.getEventType();
            if ("error".equals(type)) {
                run.put("hasError", true);
            }
            if ("run_end".equals(type)) {
                run.put("endedAt", event.getCreatedAt());
                try {
                    cn.hutool.json.JSONObject payload = cn.hutool.json.JSONUtil.parseObj(
                        event.getPayload() != null ? event.getPayload() : "{}");
                    run.put("outcome", payload.getStr("outcome", "done"));
                    run.put("turns", payload.getInt("turns", 0));
                    run.put("durationMs", payload.getLong("durationMs"));
                    run.put("toolTimeMs", payload.getLong("toolTimeMs"));
                    run.put("promptTokens", payload.getInt("promptTokens"));
                    run.put("completionTokens", payload.getInt("completionTokens"));
                    run.put("llmRetries", payload.getInt("llmRetries"));
                    run.put("failureChain", payload.getJSONArray("failureChain"));
                    run.put("engine", payload.getStr("engine"));
                } catch (Exception ignore) {
                    run.put("outcome", "done");
                }
            }
        }
        // 无 run_end 的事件流 → 状态 running（或历史遗留的僵尸 run）
        for (Map<String, Object> run : runs.values()) {
            if (!run.containsKey("outcome")) {
                run.put("outcome", "running");
            }
        }
        List<Map<String, Object>> list = new ArrayList<>(runs.values());
        java.util.Collections.reverse(list); // 最新 run 在前
        return list;
    }

    /** 某会话（可再按 runId 过滤）的 LLM 调用账本 —— generation 级根因探索 */
    @GetMapping("/sessions/{sessionKey}/llm-calls")
    public List<AgentLlmCallLog> llmCalls(@PathVariable String sessionKey,
                                          @RequestParam(required = false) String runId,
                                          @RequestParam(required = false, defaultValue = "200") int limit) {
        QueryWrapper<AgentLlmCallLog> query = new QueryWrapper<AgentLlmCallLog>()
            .eq("session_key", sessionKey)
            .orderByDesc("id")
            .last("LIMIT " + Math.min(Math.max(limit, 1), 1000));
        if (runId != null && !runId.isEmpty()) {
            query.eq("run_id", runId);
        }
        return llmCallLogService.list(query);
    }

    /**
     * 会话上下文容量（对话页「上下文容量」卡）—— 最近一次调用的真实上下文快照。
     *
     * <p>usedTokens 取最新调用的 promptTokens（模型真实看到的规模）；
     * 分类占比按拼回全量后的 request_json 字符份额，把真实 tokens 分摊到
     * 系统提示词 / 工具 schema / 消息 / 其他；缓存命中率汇总最近 20 次调用。
     * 增量行（sharedMessages）按 run 内正序拼回，与前端 Trajectory 同一套装配规则。
     */
    @GetMapping("/sessions/{sessionKey}/context-stats")
    public Map<String, Object> contextStats(@PathVariable String sessionKey) {
        List<AgentLlmCallLog> recent = llmCallLogService.list(
            new QueryWrapper<AgentLlmCallLog>()
                .eq("session_key", sessionKey)
                .orderByDesc("id")
                .last("LIMIT 20"));
        Map<String, Object> empty = new LinkedHashMap<>();
        empty.put("usedTokens", 0);
        empty.put("estimated", false);
        if (recent.isEmpty()) {
            return empty;
        }
        AgentLlmCallLog latest = recent.get(0);

        // 会话里混着旁路调用（记忆抽取 / 压缩摘要：无 tools、非增量形态）——
        // 它们的 prompt 不是对话上下文。取最近一条「对话调用」：request 带 tools（全量）或 sharedMessages（增量）。
        AgentLlmCallLog conversation = latest;
        for (AgentLlmCallLog row : recent) {
            String req = row.getRequestJson();
            if (req != null && (req.contains("\"tools\"") || req.contains("sharedMessages"))) {
                conversation = row;
                break;
            }
        }
        latest = conversation;

        // run 内正序拼回全量 messages + tools（增量行只有尾部 messages）
        List<AgentLlmCallLog> runCalls = llmCallLogService.list(
            new QueryWrapper<AgentLlmCallLog>()
                .eq("session_key", sessionKey)
                .eq(latest.getRunId() != null, "run_id", latest.getRunId())
                .orderByAsc("id"));
        JSONArray fullMessages = null;
        JSONArray tools = null;
        for (AgentLlmCallLog row : runCalls) {
            if (row.getRequestJson() == null || row.getRequestJson().isEmpty()) {
                continue;
            }
            // 同 run 的旁路调用（记忆/压缩：全量形态但无 tools 无 sharedMessages）会打断装配链，跳过
            if (!row.getRequestJson().contains("\"tools\"")
                && !row.getRequestJson().contains("sharedMessages")) {
                continue;
            }
            try {
                JSONObject req = cn.hutool.json.JSONUtil.parseObj(row.getRequestJson());
                if (req.containsKey("sharedMessages")) {
                    if (fullMessages == null) {
                        continue; // 基准行缺失（历史数据），跳过增量行
                    }
                    int keep = req.getInt("sharedMessages", 0);
                    JSONArray tail = req.getJSONArray("messages");
                    JSONArray merged = new JSONArray();
                    for (int i = 0; i < keep && i < fullMessages.size(); i++) {
                        merged.add(fullMessages.get(i));
                    }
                    if (tail != null) {
                        tail.forEach(merged::add);
                    }
                    fullMessages = merged;
                } else {
                    fullMessages = req.getJSONArray("messages");
                    tools = req.getJSONArray("tools");
                }
            } catch (Exception ignore) {
                // 解析失败保留上一轮全量
            }
        }

        // 字符份额 → 真实 tokens 分摊（首条 system 单列，其余进消息）
        long systemChars = 0;
        long messageChars = 0;
        if (fullMessages != null) {
            for (int i = 0; i < fullMessages.size(); i++) {
                Object msg = fullMessages.get(i);
                String chars = cn.hutool.json.JSONUtil.toJsonStr(msg);
                boolean isSystem = false;
                if (msg instanceof JSONObject) {
                    isSystem = "system".equalsIgnoreCase(((JSONObject) msg).getStr("role", ""));
                }
                if (isSystem && systemChars == 0) {
                    systemChars += chars.length();
                } else {
                    messageChars += chars.length();
                }
            }
        }
        long toolsChars = tools != null ? cn.hutool.json.JSONUtil.toJsonStr(tools).length() : 0;

        Integer promptTokens = latest.getPromptTokens();
        boolean estimated = promptTokens == null || promptTokens <= 0;
        long usedTokens;
        if (estimated) {
            usedTokens = Math.round((systemChars + messageChars + toolsChars) / 2.8);
        } else {
            usedTokens = promptTokens;
        }
        Map<String, Object> breakdown = new LinkedHashMap<>();
        long totalChars = Math.max(1, systemChars + messageChars + toolsChars);
        long systemTok = usedTokens * systemChars / totalChars;
        long toolsTok = usedTokens * toolsChars / totalChars;
        long messageTok = usedTokens * messageChars / totalChars;
        breakdown.put("systemPrompt", systemTok);
        breakdown.put("tools", toolsTok);
        breakdown.put("messages", messageTok);
        breakdown.put("other", Math.max(0, usedTokens - systemTok - toolsTok - messageTok));

        // 缓存命中率 + 会话累计账（全部对话调用汇总；旁路调用不计入）
        long cachedSum = 0;
        long promptSum = 0;
        long outputSum = 0;
        int sampled = 0;
        for (AgentLlmCallLog row : conversationCalls(sessionKey)) {
            if (row.getPromptTokens() != null && row.getPromptTokens() > 0) {
                promptSum += row.getPromptTokens();
                cachedSum += row.getCachedTokens() != null ? row.getCachedTokens() : 0;
                sampled++;
            }
            if (row.getCompletionTokens() != null && row.getCompletionTokens() > 0) {
                outputSum += row.getCompletionTokens();
            }
        }

        int contextWindow = modelConfigService.getLlmConfig().getContextWindow();
        if (contextWindow <= 0) {
            contextWindow = 32768;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("usedTokens", usedTokens);
        result.put("estimated", estimated);
        result.put("breakdown", breakdown);
        // 窗口与压缩真线：容量药丸的告警线 = 跨 run 压缩（pre-run）实际使用的触发线，前端不算数
        result.put("contextWindow", contextWindow);
        result.put("compactThreshold",
            (long) contextWindow * SessionCompactionService.TOKEN_THRESHOLD_PERCENT / 100);
        if (promptSum > 0) {
            result.put("cacheHitRate", Math.round(cachedSum * 1000.0 / promptSum) / 1000.0);
            result.put("sampledCalls", sampled);
        }
        Map<String, Object> session = new LinkedHashMap<>();
        session.put("calls", sampled + (outputSum > 0 ? 0 : 0));
        session.put("promptTokens", promptSum);
        session.put("cachedTokens", cachedSum);
        session.put("completionTokens", outputSum);
        result.put("session", session);
        result.put("lastCallAt", latest.getCreatedAt());
        result.put("model", latest.getModel());
        return result;
    }

    /**
     * 按 run 聚合的单轮用量账本（对话页「本轮用量」明细卡数据源）。
     *
     * <p>从 {@code agent_llm_call_log} 按 runId 聚合对话调用（旁路调用——记忆抽取/压缩
     * 摘要——不是对话上下文，剔除），每轮一行：输入/缓存/输出 tokens、累计耗时、模型。
     * 与 run_end 事件账（/runs 接口）互补：这里有缓存命中拆分，run_end 有失败链与状态。</p>
     */
    @GetMapping("/sessions/{sessionKey}/turn-usage")
    public List<Map<String, Object>> turnUsage(@PathVariable String sessionKey) {
        List<AgentLlmCallLog> calls = llmCallLogService.list(
            new QueryWrapper<AgentLlmCallLog>()
                .eq("session_key", sessionKey)
                .orderByAsc("id")
                .last("LIMIT 2000"));

        // 保持首次出现顺序聚合（ oldest run 在前 ）
        Map<String, Map<String, Object>> byRun = new LinkedHashMap<>();
        for (AgentLlmCallLog row : calls) {
            if (!isConversationCall(row)) {
                continue;
            }
            String runId = row.getRunId() != null ? row.getRunId() : "unknown";
            Map<String, Object> agg = byRun.computeIfAbsent(runId, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("runId", k);
                m.put("calls", 0);
                m.put("promptTokens", 0L);
                m.put("cachedTokens", 0L);
                m.put("completionTokens", 0L);
                m.put("durationMs", 0L);
                return m;
            });
            agg.put("calls", (Integer) agg.get("calls") + 1);
            agg.put("promptTokens", (Long) agg.get("promptTokens") + nz(row.getPromptTokens()));
            agg.put("cachedTokens", (Long) agg.get("cachedTokens") + nz(row.getCachedTokens()));
            agg.put("completionTokens", (Long) agg.get("completionTokens") + nz(row.getCompletionTokens()));
            agg.put("durationMs", (Long) agg.get("durationMs") + (row.getDurationMs() != null ? row.getDurationMs() : 0L));
            if (row.getModel() != null && !row.getModel().isEmpty()) {
                agg.put("model", row.getModel());
            }
            agg.put("lastCallAt", row.getCreatedAt());
        }
        List<Map<String, Object>> list = new ArrayList<>(byRun.values());
        if (list.size() > 100) {
            list = list.subList(list.size() - 100, list.size());
        }
        return list;
    }

    /** 对话调用（进模型上下文的调用）：带工具 schema 或增量形态；记忆/压缩旁路调用剔除 */
    private boolean isConversationCall(AgentLlmCallLog row) {
        if (row.getToolsCount() != null && row.getToolsCount() > 0) {
            return true;
        }
        String req = row.getRequestJson();
        return req != null && req.contains("sharedMessages");
    }

    /** 会话全部对话调用（id 正序） */
    private List<AgentLlmCallLog> conversationCalls(String sessionKey) {
        return llmCallLogService.list(
            new QueryWrapper<AgentLlmCallLog>()
                .eq("session_key", sessionKey)
                .orderByAsc("id")
                .last("LIMIT 2000"));
    }

    private static long nz(Integer v) {
        return v != null && v > 0 ? v : 0L;
    }

    /**
     * AgentScope Service 远端会话快照（代理）。
     * 返回 {linked, remoteSessionId, remoteAgentId, snapshot|snapshotError}；
     * linked=false 表示该会话不是 as-service 引擎（或尚未绑定远端会话）。
     */
    @GetMapping("/sessions/{sessionKey}/as-service")
    public Map<String, Object> asServiceSession(@PathVariable String sessionKey) {
        Map<String, Object> result = new LinkedHashMap<>();
        cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSession row =
            asServiceSessionService.findByKey(sessionKey);
        if (row == null
            || !"as-service".equals(row.getEngine())
            || row.getRemoteSessionId() == null || row.getRemoteSessionId().isEmpty()) {
            result.put("linked", false);
            return result;
        }
        result.put("linked", true);
        result.put("remoteSessionId", row.getRemoteSessionId());
        result.put("remoteAgentId", row.getRemoteAgentId());
        try {
            AgentProviderConfigService.AsServiceConfig cfg = providerConfigService.getAsServiceConfig();
            // hutool 的 JSONNull 会让 Jackson 序列化失败：转成 JSON 文本再解析为纯 Map（null 归 null）
            String snapText = asServiceClient.getSessionSnapshot(cfg, row.getRemoteSessionId()).toString();
            result.put("snapshot", new com.fasterxml.jackson.databind.ObjectMapper().readValue(snapText, Map.class));
        } catch (Exception e) {
            log.warn("[observability] 拉取 Service 会话快照失败 session={}: {}", sessionKey, e.getMessage());
            result.put("snapshotError", e.getMessage());
        }
        return result;
    }
}
