package cn.boommanpro.gaia.workflow.app.controller.api;

import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.AgentProviderConfigService;
import cn.boommanpro.gaia.workflow.app.service.ThinkingParamPlanner;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSession;
import cn.boommanpro.gaia.workflow.infra.manage.entity.LlmModel;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentLlmCallLog;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentLlmCallLogService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionService;
import cn.boommanpro.gaia.workflow.infra.manage.service.LlmModelService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 模型配置 API（owb 式多模型，2026-10-11）。
 *
 * <pre>
 * GET    /api/agent/models                        条目列表（apiKey 掩码）
 * POST   /api/agent/models                        新建/更新条目（带 id = 更新）
 * DELETE /api/agent/models/{id}                   删除条目（会话绑定/全局默认指向它时明确报错）
 * POST   /api/agent/models/active                 设全局默认 {id|null}
 * GET    /api/agent/models/thinking-levels        五档能力（按模型逐档算 supported/note）
 * POST   /api/agent/session/{key}/model           会话绑定模型 {modelId|null}
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/agent")
public class ModelConfigController {

    private final LlmModelService llmModelService;
    private final AgentModelConfigService modelConfigService;
    private final AgentSessionService sessionService;
    private final ThinkingParamPlanner thinkingPlanner;
    private final AgentLlmCallLogService llmCallLogService;
    private final AgentProviderConfigService providerConfigService;

    public ModelConfigController(LlmModelService llmModelService,
                                 AgentModelConfigService modelConfigService,
                                 AgentSessionService sessionService,
                                 ThinkingParamPlanner thinkingPlanner,
                                 AgentLlmCallLogService llmCallLogService,
                                 AgentProviderConfigService providerConfigService) {
        this.llmModelService = llmModelService;
        this.modelConfigService = modelConfigService;
        this.sessionService = sessionService;
        this.thinkingPlanner = thinkingPlanner;
        this.llmCallLogService = llmCallLogService;
        this.providerConfigService = providerConfigService;
    }

    @GetMapping("/models")
    public Map<String, Object> list() {
        List<Map<String, Object>> items = new ArrayList<>();
        Long activeId = modelConfigService.getActiveModelId();
        for (LlmModel m : llmModelService.list(new QueryWrapper<LlmModel>().orderByAsc("sort_order", "id"))) {
            items.add(toPublicJson(m, m.getId() != null && m.getId().equals(activeId)));
        }
        JSONObject result = new JSONObject()
            .set("items", items)
            .set("activeModelId", activeId)
            .set("globalThinking", modelConfigService.globalThinkingLevel())
            // 模型管理仅自研引擎（local）有意义：方舟托管的模型由远端 Agent 管理
            .set("engineMode", providerConfigService.getDefaultEngineMode());
        return result;
    }

    @PostMapping("/models")
    public Map<String, Object> save(@RequestBody Map<String, Object> body) {
        Long id = body.get("id") instanceof Number n ? n.longValue() : null;
        String displayName = str(body, "displayName");
        if (displayName == null || displayName.trim().isEmpty()) {
            return err("displayName 不能为空");
        }
        String modelId = str(body, "modelId");
        if (modelId == null || modelId.trim().isEmpty()) {
            return err("modelId（上游模型 ID）不能为空");
        }
        LlmModel entry = id != null ? llmModelService.getById(id) : new LlmModel();
        if (id != null && entry == null) {
            return err("模型条目不存在: " + id);
        }
        // 唯一名校验（排除自己）
        LlmModel dup = llmModelService.getOne(
            new QueryWrapper<LlmModel>().eq("display_name", displayName.trim()).last("LIMIT 1"));
        if (dup != null && !dup.getId().equals(entry.getId())) {
            return err("显示名已存在: " + displayName.trim());
        }
        entry.setDisplayName(displayName.trim());
        entry.setVendor(str(body, "vendor"));
        entry.setBaseUrl(str(body, "baseUrl"));
        entry.setApiKey(str(body, "apiKey"));
        entry.setModelId(modelId.trim());
        entry.setThinkingOverride(str(body, "thinkingOverride"));
        entry.setMaxTokens(body.get("maxTokens") instanceof Number n ? n.intValue() : null);
        entry.setTemperature(body.get("temperature") instanceof Number n ? n.doubleValue() : null);
        entry.setExtraBody(str(body, "extraBody"));
        entry.setEnabled(body.get("enabled") instanceof Boolean b && !b ? 0 : 1);
        entry.setSortOrder(body.get("sortOrder") instanceof Number n ? n.intValue() : 0);
        String now = LocalDateTime.now().toString();
        if (entry.getCreatedAt() == null) {
            entry.setCreatedAt(now);
        }
        entry.setUpdatedAt(now);
        llmModelService.saveOrUpdate(entry);
        JSONObject result = new JSONObject().set("success", true).set("id", entry.getId());
        return result;
    }

    @DeleteMapping("/models/{id}")
    public Map<String, Object> delete(@PathVariable Long id) {
        Long activeId = modelConfigService.getActiveModelId();
        if (id.equals(activeId)) {
            return err("该模型是全局默认模型，先把默认切到其他模型再删除");
        }
        Long bound = sessionService.count(new QueryWrapper<AgentSession>().eq("model_id", id)) > 0 ? id : null;
        if (bound != null) {
            return err("仍有会话绑定该模型，先在对话里切换模型再删除");
        }
        llmModelService.removeById(id);
        return new JSONObject().set("success", true);
    }

    @PostMapping("/models/active")
    public Map<String, Object> setActive(@RequestBody Map<String, Object> body) {
        Long id = body.get("id") instanceof Number n ? n.longValue() : null;
        if (id != null && llmModelService.getById(id) == null) {
            return err("模型条目不存在: " + id);
        }
        modelConfigService.setActiveModelId(id);
        return new JSONObject().set("success", true).set("activeModelId", id);
    }

    /** 设全局思考档位（auto/off/low/medium/high） */
    @PostMapping("/models/thinking")
    public Map<String, Object> setThinking(@RequestBody Map<String, Object> body) {
        String level = body.get("level") != null ? String.valueOf(body.get("level")) : "auto";
        boolean legal = false;
        for (String lv : ThinkingParamPlanner.levels()) {
            if (lv.equals(level)) { legal = true; break; }
        }
        if (!legal) {
            return err("非法思考档位: " + level);
        }
        modelConfigService.setGlobalThinkingLevel(level);
        return new JSONObject().set("success", true).set("globalThinking", level);
    }

    /** 五档思考能力（能力判断只在服务端做，前端照渲染） */
    @GetMapping("/models/thinking-levels")
    public Map<String, Object> thinkingLevels(@RequestParam(required = false) Long modelId) {
        LlmModel entry = modelId != null ? llmModelService.getById(modelId) : null;
        String vendor = entry != null ? entry.getVendor() : null;
        String mid = entry != null ? entry.getModelId() : null;
        List<Map<String, Object>> levels = new ArrayList<>();
        for (String lv : ThinkingParamPlanner.levels()) {
            ThinkingParamPlanner.Plan plan = thinkingPlanner.plan(vendor, mid, lv);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("level", plan.level);
            item.put("supported", plan.supported);
            item.put("note", plan.note);
            levels.add(item);
        }
        return new JSONObject().set("levels", levels);
    }

    /** 会话级模型绑定（null/缺 modelId = 跟随全局默认） */
    @PostMapping("/session/{sessionKey}/model")
    public Map<String, Object> setSessionModel(@PathVariable String sessionKey,
                                               @RequestBody(required = false) Map<String, Object> body) {
        Long modelId = null;
        if (body != null && body.get("modelId") instanceof Number n) {
            modelId = n.longValue();
        }
        if (modelId != null && llmModelService.getById(modelId) == null) {
            return err("模型条目不存在: " + modelId);
        }
        AgentSession session = sessionService.getOne(
            new QueryWrapper<AgentSession>().eq("session_key", sessionKey).last("LIMIT 1"));
        if (session == null) {
            return err("会话不存在: " + sessionKey);
        }
        // 解绑（modelId=null）必须显式 set null —— updateById 默认忽略 null 字段
        com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<AgentSession> update =
            new com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<>();
        update.eq("id", session.getId()).set("model_id", modelId);
        sessionService.update(update);
        return new JSONObject().set("success", true).set("modelId", modelId);
    }

    /** 会话当前模型绑定（回显选择器标签） */
    @GetMapping("/session/{sessionKey}/model")
    public Map<String, Object> getSessionModel(@PathVariable String sessionKey) {
        AgentSession session = sessionService.getOne(
            new QueryWrapper<AgentSession>().eq("session_key", sessionKey).last("LIMIT 1"));
        Long modelId = session != null ? session.getModelId() : null;
        JSONObject result = new JSONObject()
            .set("modelId", modelId)
            .set("activeModelId", modelConfigService.getActiveModelId());
        if (modelId != null) {
            LlmModel entry = llmModelService.getById(modelId);
            if (entry != null) {
                result.set("model", toPublicJson(entry, false));
            }
        }
        return result;
    }

    /**
     * 测活：按条目（id）或裸参数向 baseUrl 发一条 max_tokens=1 的 chat 请求，返回延迟/错误。
     * 对标 owb 的渠道测试探针。
     */
    @PostMapping("/models/test")
    public Map<String, Object> test(@RequestBody Map<String, Object> body) {
        String baseUrl;
        String apiKey;
        String modelId;
        if (body.get("id") instanceof Number n) {
            LlmModel entry = llmModelService.getById(n.longValue());
            if (entry == null) {
                return err("模型条目不存在: " + n.longValue());
            }
            baseUrl = entry.getBaseUrl();
            apiKey = entry.getApiKey();
            modelId = entry.getModelId();
        } else {
            baseUrl = str(body, "baseUrl");
            apiKey = str(body, "apiKey");
            modelId = str(body, "modelId");
        }
        if (baseUrl == null || modelId == null) {
            return err("baseUrl/modelId 不能为空");
        }
        long started = System.currentTimeMillis();
        try {
            java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(8)).build();
            String url = baseUrl.endsWith("/") ? baseUrl + "chat/completions" : baseUrl + "/chat/completions";
            JSONArray pingMessages = new JSONArray();
            pingMessages.add(new JSONObject().set("role", "user").set("content", "ping"));
            String payload = new JSONObject()
                .set("model", modelId)
                .set("max_tokens", 1)
                .set("messages", pingMessages)
                .toString();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create(url))
                .timeout(java.time.Duration.ofSeconds(20))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + (apiKey == null ? "" : apiKey))
                .POST(java.net.http.HttpRequest.BodyPublishers.ofString(payload))
                .build();
            java.net.http.HttpResponse<String> resp = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            long cost = System.currentTimeMillis() - started;
            if (resp.statusCode() / 100 == 2) {
                return new JSONObject().set("success", true).set("latencyMs", cost);
            }
            String bodyText = resp.body() == null ? "" : resp.body();
            return new JSONObject().set("success", false).set("latencyMs", cost)
                .set("error", "HTTP " + resp.statusCode() + ": "
                    + bodyText.substring(0, Math.min(bodyText.length(), 300)));
        } catch (Exception e) {
            return new JSONObject().set("success", false)
                .set("latencyMs", System.currentTimeMillis() - started)
                .set("error", e.getMessage());
        }
    }

    /**
     * 模型健康账本（对标 owb model_health）：按模型聚合最近 N 次调用的成败与平均延迟。
     * 数据源是 agent_llm_call_log（真实执行流量，非探针）。
     */
    @GetMapping("/models/health")
    public Map<String, Object> health() {
        List<Map<String, Object>> items = new ArrayList<>();
        List<AgentLlmCallLog> logs = llmCallLogService.list(
            new QueryWrapper<AgentLlmCallLog>().orderByDesc("id").last("LIMIT 500"));
        // 按模型名滑动窗口近 20 次
        Map<String, List<AgentLlmCallLog>> byModel = new LinkedHashMap<>();
        for (AgentLlmCallLog log : logs) {
            String key = log.getModel() == null ? "(unknown)" : log.getModel();
            List<AgentLlmCallLog> list = byModel.computeIfAbsent(key, k -> new ArrayList<>());
            if (list.size() < 20) {
                list.add(log);
            }
        }
        for (Map.Entry<String, List<AgentLlmCallLog>> e : byModel.entrySet()) {
            int total = e.getValue().size();
            long errors = e.getValue().stream().filter(l -> "error".equalsIgnoreCase(l.getStatus())).count();
            double avgLatency = e.getValue().stream()
                .filter(l -> l.getDurationMs() != null).mapToLong(AgentLlmCallLog::getDurationMs).average().orElse(0);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("model", e.getKey());
            item.put("total", total);
            item.put("errors", errors);
            item.put("successRate", total > 0 ? (total - errors) / (double) total : 0);
            item.put("avgLatencyMs", (long) avgLatency);
            item.put("healthy", errors == 0 || (total - errors) >= errors);
            items.add(item);
        }
        return new JSONObject().set("items", items);
    }

    // ---------------- 内部 ----------------

    private static Map<String, Object> toPublicJson(LlmModel m, boolean active) {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("id", m.getId());
        json.put("displayName", m.getDisplayName());
        json.put("vendor", m.getVendor());
        json.put("baseUrl", m.getBaseUrl());
        // apiKey 掩码回显：原样传回 = 未修改（owb 红线）
        json.put("apiKeyMasked", mask(m.getApiKey()));
        json.put("modelId", m.getModelId());
        json.put("thinkingOverride", m.getThinkingOverride());
        json.put("maxTokens", m.getMaxTokens());
        json.put("temperature", m.getTemperature());
        json.put("enabled", m.getEnabled() == null || m.getEnabled() == 1);
        json.put("active", active);
        return json;
    }

    private static String mask(String key) {
        if (key == null || key.isEmpty()) {
            return "";
        }
        if (key.length() <= 8) {
            return "****";
        }
        return key.substring(0, 4) + "****" + key.substring(key.length() - 4);
    }

    private static String str(Map<String, Object> body, String key) {
        Object v = body.get(key);
        if (v == null) {
            return null;
        }
        String s = String.valueOf(v);
        // 掩码原样传回 = 未修改
        if ("apiKey".equals(key) && s.contains("****")) {
            return null;
        }
        return s.isEmpty() ? null : s;
    }

    private static Map<String, Object> err(String message) {
        return new JSONObject().set("success", false).set("error", message);
    }
}
