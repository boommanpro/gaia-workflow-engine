package cn.boommanpro.gaia.workflow.app.controller.api;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowApi;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowApiService;
import cn.hutool.json.JSONUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("api")
public class GaiaWorkflowApiController {

    @Autowired
    private GaiaWorkflowApiService apiService;

    @Autowired
    private cn.boommanpro.gaia.workflow.app.agent.session.SessionArtifactStore artifactStore;

    /**
     * 发布为 API：把当前生效版本冻结为一个对外可调用的端点。
     * body 可选 sessionKey：从 AI 会话工作区发起发布时传入，成功后
     * 在该会话落一条 release 产物（发布收口卡），把「对话即 API」的链路闭合。
     */
    @PostMapping("workflow-api/publish")
    public Map<String, Object> publish(@RequestBody Map<String, String> body) {
        String code = body.get("workflowCode");
        GaiaWorkflowApi api = apiService.publish(code, body.get("apiName"), body.get("apiDesc"));
        emitReleaseArtifact(body.get("sessionKey"), api);
        return toMetaMap(api, true);
    }

    /** 发布收口产物：只落脱敏 Key，避免明文密钥进产物/对话流 */
    private void emitReleaseArtifact(String sessionKey, GaiaWorkflowApi api) {
        if (sessionKey == null || sessionKey.isEmpty() || api == null) {
            return;
        }
        try {
            String key = api.getApiKey();
            String masked = key != null && key.length() > 10 ? key.substring(0, 9) + "…" : key;
            artifactStore.appendArtifact(sessionKey, null,
                cn.boommanpro.gaia.workflow.app.agent.session.SessionArtifactStore.TYPE_RELEASE,
                "published", "已发布 API：" + (api.getApiName() != null ? api.getApiName() : api.getWorkflowCode()),
                "POST " + api.getApiPath(),
                new cn.hutool.json.JSONObject()
                    .set("workflowCode", api.getWorkflowCode())
                    .set("apiName", api.getApiName())
                    .set("apiPath", api.getApiPath())
                    .set("versionNumber", api.getVersionNumber())
                    .set("apiKeyMasked", masked)
                    .set("invokeUrl", "/api/v1/wf/" + api.getWorkflowCode()));
        } catch (Exception e) {
            // 产物落库失败不影响发布主流程
        }
    }

    /** 下架 API */
    @PostMapping("workflow-api/unpublish/{workflowCode}")
    public Map<String, Object> unpublish(@PathVariable String workflowCode) {
        apiService.unpublish(workflowCode);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("success", true);
        return r;
    }

    /** 重新生成 API Key（仅本次返回明文） */
    @PostMapping("workflow-api/regenerate-key/{workflowCode}")
    public Map<String, Object> regenerateKey(@PathVariable String workflowCode) {
        GaiaWorkflowApi api = apiService.regenerateKey(workflowCode);
        return toMetaMap(api, true);
    }

    /** 已发布 API 列表（Key 脱敏） */
    @GetMapping("workflow-api/list")
    public List<Map<String, Object>> list() {
        return apiService.listPublished().stream()
                .map(a -> toMetaMap(a, false))
                .collect(Collectors.toList());
    }

    /** 单个 API 元信息（Key 脱敏）；未发布时 published=false */
    @GetMapping("workflow-api/{workflowCode}")
    public Map<String, Object> get(@PathVariable String workflowCode) {
        GaiaWorkflowApi api = apiService.getMeta(workflowCode);
        if (api == null) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("published", false);
            return r;
        }
        Map<String, Object> r = toMetaMap(api, false);
        r.put("published", true);
        return r;
    }

    /** 调用看板：全部已发布 API 聚合；days 为统计窗口（近 N 天） */
    @GetMapping("workflow-api/stats/overview")
    public Map<String, Object> overview(@RequestParam(value = "days", defaultValue = "30") int days) {
        return apiService.buildStats(null, days);
    }

    /** 调用看板：单个 API */
    @GetMapping("workflow-api/stats/{workflowCode}")
    public Map<String, Object> stats(@PathVariable String workflowCode,
                                     @RequestParam(value = "days", defaultValue = "30") int days) {
        return apiService.buildStats(workflowCode, days);
    }

    /**
     * 调用看板：最近调用明细（支持按 API / 时间窗口 / 状态过滤）。
     * 供看板的明细表格与「点击失败项下钻」使用。
     */
    @GetMapping("workflow-api/recent-calls")
    public List<Map<String, Object>> recentCalls(
            @RequestParam(value = "workflowCode", required = false) String workflowCode,
            @RequestParam(value = "days", defaultValue = "30") int days,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "limit", defaultValue = "50") int limit) {
        return apiService.recentCalls(workflowCode, days, status, limit);
    }

    private Map<String, Object> toMetaMap(GaiaWorkflowApi api, boolean withFullKey) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("workflowCode", api.getWorkflowCode());
        m.put("apiName", api.getApiName());
        m.put("apiDesc", api.getApiDesc());
        m.put("versionNumber", api.getVersionNumber());
        m.put("apiPath", api.getApiPath());
        m.put("status", api.getStatus() != null && api.getStatus() == 1 ? "published" : "draft");
        m.put("createdAt", api.getCreatedAt());
        m.put("updatedAt", api.getUpdatedAt());
        if (api.getRequestSchema() != null) m.put("requestSchema", JSONUtil.parseObj(api.getRequestSchema()));
        if (api.getResponseSchema() != null) m.put("responseSchema", JSONUtil.parseObj(api.getResponseSchema()));
        if (api.getErrorCodes() != null) m.put("errorCodes", JSONUtil.parseArray(api.getErrorCodes()));
        String full = api.getApiKey();
        m.put("apiKeyMasked", mask(full));
        if (withFullKey) {
            m.put("apiKey", full);
        }
        return m;
    }

    private static String mask(String key) {
        if (key == null || key.length() <= 6) return "****";
        return key.substring(0, 6) + "****";
    }
}
