package cn.boommanpro.gaia.workflow.app.controller.api;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult;
import cn.boommanpro.gaia.workflow.app.agent.runtime.ManagedAgentService;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * 受管 Agent 的对外接口。
 *
 * <p>核心是 {@code POST /api/managed-agent/run}：
 * 不需要浏览器、不需要 SSE，一条 HTTP 请求触发一次完整的后端自治运行。</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/managed-agent")
public class ManagedAgentController {

    private final ManagedAgentService managedAgentService;

    public ManagedAgentController(ManagedAgentService managedAgentService) {
        this.managedAgentService = managedAgentService;
    }

    /** 列出所有已注册的 Agent 及其定义 */
    @GetMapping("/agents")
    public Map<String, Object> listAgents() {
        Map<String, AgentDefinition> agents = managedAgentService.listAgents();
        Map<String, Object> result = new HashMap<>();
        result.put("count", agents.size());
        result.put("agents", agents);
        return result;
    }

    /**
     * 触发一次后端自治运行（同步等待结果）。
     *
     * <pre>
     * { "agentId": "workflow-architect", "message": "做一个舆情分析工作流" }
     * </pre>
     */
    @PostMapping("/run")
    public Map<String, Object> run(@RequestBody Map<String, Object> body) {
        String message = body.get("message") != null ? String.valueOf(body.get("message")) : null;
        if (message == null || message.trim().isEmpty()) {
            return failure("message is required");
        }
        String agentId = body.get("agentId") != null ? String.valueOf(body.get("agentId")) : null;

        @SuppressWarnings("unchecked")
        Map<String, Object> variables =
            body.get("variables") instanceof Map ? (Map<String, Object>) body.get("variables") : null;

        AgentRunResult result = managedAgentService.runHeadless(agentId, message, variables);
        return toMap(result);
    }

    /**
     * 异步触发，立即返回一个受理凭据。
     * 适合前端不想长连接等待的场景。
     */
    @PostMapping("/run/async")
    public Map<String, Object> runAsync(@RequestBody Map<String, Object> body) {
        String message = body.get("message") != null ? String.valueOf(body.get("message")) : null;
        if (message == null || message.trim().isEmpty()) {
            return failure("message is required");
        }
        String agentId = body.get("agentId") != null ? String.valueOf(body.get("agentId")) : null;

        CompletableFuture<AgentRunResult> future = managedAgentService.runHeadlessAsync(agentId, message);
        Map<String, Object> accepted = new HashMap<>();
        accepted.put("accepted", true);
        accepted.put("agentId", agentId);
        accepted.put("message", message);
        // 便于调用方轮询结果
        future.whenComplete((result, error) -> log.info("[managed-agent] async run finished, error={}",
            error == null ? "none" : error.getMessage()));
        return accepted;
    }

    /**
     * SSE 形态的自治运行：工具在后端执行，但过程实时推给浏览器。
     * 与旧链路的区别是「不再依赖前端回灌工具结果」。
     */
    @GetMapping("/run/stream")
    public SseEmitter runStream(@RequestParam String message,
                                @RequestParam(required = false) String agentId) {
        SseEmitter emitter = new SseEmitter(0L);
        CompletableFuture.runAsync(() -> {
            try {
                emitter.send(SseEmitter.event().name("accepted")
                    .data(new JSONObject().set("agentId", agentId).toString()));
                AgentRunResult result = managedAgentService.runHeadless(agentId, message, null);
                emitter.send(SseEmitter.event().name("result").data(toJson(result)));
                emitter.send(SseEmitter.event().name("done").data("{}"));
                emitter.complete();
            } catch (Exception e) {
                log.error("[managed-agent] stream run failed", e);
                emitter.completeWithError(e);
            }
        });
        return emitter;
    }

    /** 查询某个自治会话的完整消息 */
    @GetMapping("/conversation/{sessionKey}")
    public Map<String, Object> conversation(@PathVariable String sessionKey) {
        Map<String, Object> result = new HashMap<>();
        result.put("sessionKey", sessionKey);
        result.put("messages", managedAgentService.getConversation(sessionKey));
        return result;
    }

    private Map<String, Object> failure(String message) {
        Map<String, Object> map = new HashMap<>();
        map.put("success", false);
        map.put("error", message);
        return map;
    }

    private String toJson(AgentRunResult result) {
        return new JSONObject(toMap(result)).toString();
    }

    private Map<String, Object> toMap(AgentRunResult result) {
        Map<String, Object> map = new HashMap<>();
        map.put("content", result.getContent());
        map.put("agentId", result.getAgentId());
        map.put("sessionKey", result.getSessionKey());
        map.put("turns", result.getTurns());
        map.put("abortedByTurnLimit", result.isAbortedByTurnLimit());
        map.put("executedTools", result.getExecutedTools());
        map.put("success", !result.isError());
        if (result.getErrorMessage() != null) {
            map.put("error", result.getErrorMessage());
        }
        return map;
    }
}
