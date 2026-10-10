package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSessionEvent;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolCallLog;
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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Agent 可观测性端点（v2）—— 成功率度量 + 事件回放。
 *
 * <ul>
 *   <li>{@code GET /api/agent/metrics/tools} — 按 工具×结局 聚合的调用量与耗时，
 *       含一次通过率（SUCCESS / 总数），金丝雀回归的数据口径；</li>
 *   <li>{@code GET /api/agent/metrics/sessions/{sessionKey}/runs/{runId}} — 单次 run 的事件回放
 *       （agent_session_event 按序），排查「模型当时看到了什么」。</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/api/agent/metrics")
public class AgentObservabilityController {

    private final AgentToolCallLogService toolCallLogService;
    private final AgentSessionEventService sessionEventService;

    public AgentObservabilityController(AgentToolCallLogService toolCallLogService,
                                        AgentSessionEventService sessionEventService) {
        this.toolCallLogService = toolCallLogService;
        this.sessionEventService = sessionEventService;
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
}
