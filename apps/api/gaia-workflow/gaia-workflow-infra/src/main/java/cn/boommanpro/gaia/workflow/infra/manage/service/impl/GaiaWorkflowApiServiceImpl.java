package cn.boommanpro.gaia.workflow.infra.manage.service.impl;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowApi;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowLog;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.GaiaWorkflowApiMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowApiService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowLogService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.hutool.core.util.IdUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GaiaWorkflowApiServiceImpl extends ServiceImpl<GaiaWorkflowApiMapper, GaiaWorkflowApi>
        implements GaiaWorkflowApiService {

    @Autowired
    private GaiaWorkflowService workflowService;
    @Autowired
    private GaiaWorkflowVersionService versionService;
    @Autowired
    private GaiaWorkflowLogService logService;

    private static final String RESPONSE_SCHEMA = JSONUtil.toJsonStr(
            new JSONObject()
                    .set("type", "object")
                    .set("properties", new JSONObject()
                            .set("success", new JSONObject().set("type", "boolean").set("description", "是否执行成功"))
                            .set("data", new JSONObject().set("type", "object").set("description", "工作流输出，结构由工作流本身决定"))
                            .set("message", new JSONObject().set("type", "string").set("description", "结果描述"))
                            .set("executionId", new JSONObject().set("type", "string").set("description", "本次执行ID"))
                    )
    );

    private static final String DEFAULT_ERROR_CODES = JSONUtil.toJsonStr(new JSONArray()
            .set(new JSONObject().set("code", "401").set("message", "UNAUTHORIZED").set("description", "API Key 缺失或无效"))
            .set(new JSONObject().set("code", "400").set("message", "INVALID_PARAM").set("description", "请求参数缺失或格式错误"))
            .set(new JSONObject().set("code", "404").set("message", "WORKFLOW_NOT_FOUND").set("description", "工作流不存在或未发布"))
            .set(new JSONObject().set("code", "429").set("message", "RATE_LIMITED").set("description", "调用频率超限"))
            .set(new JSONObject().set("code", "500").set("message", "EXECUTION_FAILED").set("description", "工作流执行失败"))
    );

    @Override
    public GaiaWorkflowApi publish(String workflowCode, String apiName, String apiDesc) {
        GaiaWorkflow workflow = workflowService.getOne(new QueryWrapper<GaiaWorkflow>().eq("workflow_code", workflowCode));
        if (workflow == null) {
            throw new IllegalArgumentException("工作流不存在: " + workflowCode);
        }
        GaiaWorkflowVersion version = versionService.getOne(new QueryWrapper<GaiaWorkflowVersion>()
                .eq("workflow_code", workflowCode).eq("id", workflow.getCurrentVersionId()).eq("is_current", 1));
        if (version == null) {
            throw new IllegalArgumentException("工作流尚未落版，无法发布: " + workflowCode);
        }
        String requestSchema = deriveRequestSchema(version.getWorkflowData());

        GaiaWorkflowApi existing = getOne(new QueryWrapper<GaiaWorkflowApi>().eq("workflow_code", workflowCode));
        if (existing == null) {
            existing = new GaiaWorkflowApi();
            existing.setWorkflowCode(workflowCode);
        }
        existing.setApiName(apiName != null && !apiName.isEmpty() ? apiName : workflow.getWorkflowName());
        existing.setApiDesc(apiDesc != null ? apiDesc : workflow.getWorkflowDesc());
        existing.setVersionNumber(version.getVersionNumber());
        existing.setApiPath("/api/v1/wf/" + workflowCode);
        if (existing.getApiKey() == null || existing.getApiKey().isEmpty()) {
            existing.setApiKey("sk-" + IdUtil.fastSimpleUUID());
        }
        existing.setStatus(1);
        existing.setRequestSchema(requestSchema);
        existing.setResponseSchema(RESPONSE_SCHEMA);
        existing.setErrorCodes(DEFAULT_ERROR_CODES);
        existing.setIsDeleted(0);
        saveOrUpdate(existing);
        return existing;
    }

    @Override
    public void unpublish(String workflowCode) {
        GaiaWorkflowApi api = getOne(new QueryWrapper<GaiaWorkflowApi>().eq("workflow_code", workflowCode));
        if (api != null) {
            api.setStatus(0);
            updateById(api);
        }
    }

    @Override
    public GaiaWorkflowApi regenerateKey(String workflowCode) {
        GaiaWorkflowApi api = getOne(new QueryWrapper<GaiaWorkflowApi>().eq("workflow_code", workflowCode));
        if (api == null) {
            throw new IllegalArgumentException("工作流尚未发布为 API: " + workflowCode);
        }
        api.setApiKey("sk-" + IdUtil.fastSimpleUUID());
        updateById(api);
        return api;
    }

    @Override
    public GaiaWorkflowApi getMeta(String workflowCode) {
        GaiaWorkflowApi api = getOne(new QueryWrapper<GaiaWorkflowApi>().eq("workflow_code", workflowCode));
        if (api == null || api.getStatus() != 1) {
            return null;
        }
        api.setApiKey(maskKey(api.getApiKey()));
        return api;
    }

    @Override
    public GaiaWorkflowApi getByCodeAndKey(String workflowCode, String apiKey) {
        return getOne(new QueryWrapper<GaiaWorkflowApi>()
                .eq("workflow_code", workflowCode).eq("api_key", apiKey).eq("status", 1).eq("is_deleted", 0));
    }

    @Override
    public List<GaiaWorkflowApi> listPublished() {
        List<GaiaWorkflowApi> list = list(new QueryWrapper<GaiaWorkflowApi>().eq("status", 1).eq("is_deleted", 0));
        list.forEach(a -> a.setApiKey(maskKey(a.getApiKey())));
        return list;
    }

    @Override
    public Map<String, Object> buildStats(String workflowCode, int days) {
        int window = days <= 0 ? 30 : days;
        LocalDate today = LocalDate.now();
        LocalDate from = today.minusDays(window - 1L);

        // 时间范围过滤：看板的统计口径与「近 N 天」一致
        List<GaiaWorkflowLog> logs = queryApiLogs(workflowCode).stream()
                .filter(l -> l.getCreatedAt() != null && !l.getCreatedAt().toLocalDate().isBefore(from))
                .collect(Collectors.toList());

        int total = logs.size();
        long success = logs.stream().filter(l -> "SUCCESS".equals(l.getStatus())).count();
        long failed = total - success;
        double successRate = total == 0 ? 0 : (double) success / total;

        List<Long> durations = logs.stream().map(GaiaWorkflowLog::getExecutionDuration)
                .filter(Objects::nonNull).sorted().collect(Collectors.toList());
        double avg = durations.isEmpty() ? 0 : durations.stream().mapToLong(Long::longValue).average().orElse(0);
        long p95 = percentile(durations, 0.95);

        // 近 window 天趋势
        Map<LocalDate, Bucket> buckets = new LinkedHashMap<>();
        for (int i = window - 1; i >= 0; i--) {
            buckets.put(today.minusDays(i), new Bucket());
        }
        for (GaiaWorkflowLog log : logs) {
            if (log.getCreatedAt() == null) continue;
            LocalDate d = log.getCreatedAt().toLocalDate();
            Bucket b = buckets.get(d);
            if (b == null) continue;
            b.calls++;
            if ("SUCCESS".equals(log.getStatus())) b.success++;
            else b.failed++;
            if (log.getExecutionDuration() != null) b.durationSum += log.getExecutionDuration();
        }
        List<Map<String, Object>> trend = new ArrayList<>();
        for (Map.Entry<LocalDate, Bucket> e : buckets.entrySet()) {
            Bucket b = e.getValue();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date", e.getKey().toString());
            row.put("calls", b.calls);
            row.put("success", b.success);
            row.put("failed", b.failed);
            row.put("avgDurationMs", b.calls == 0 ? 0 : Math.round((double) b.durationSum / b.calls));
            trend.add(row);
        }

        // 失败分布（按错误信息归类）
        Map<String, Long> failMap = logs.stream()
                .filter(l -> !"SUCCESS".equals(l.getStatus()))
                .collect(Collectors.groupingBy(
                        l -> (l.getErrorMessage() == null || l.getErrorMessage().isEmpty()) ? "UNKNOWN" : l.getErrorMessage(),
                        Collectors.counting()));
        List<Map<String, Object>> failureDistribution = failMap.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("reason", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalCalls", total);
        result.put("successCalls", success);
        result.put("failedCalls", failed);
        result.put("successRate", Math.round(successRate * 10000.0) / 10000.0);
        result.put("avgDurationMs", Math.round(avg));
        result.put("p95DurationMs", p95);
        result.put("trend", trend);
        result.put("failureDistribution", failureDistribution);
        // 回传过滤口径，便于前端确认当前窗口
        result.put("days", window);
        result.put("from", from.toString());
        result.put("to", today.toString());
        return result;
    }

    @Override
    public List<Map<String, Object>> recentCalls(String workflowCode, int days, String status, int limit) {
        int window = days <= 0 ? 30 : days;
        int cap = limit <= 0 || limit > 200 ? 50 : limit;
        LocalDate from = LocalDate.now().minusDays(window - 1L);
        return queryApiLogs(workflowCode).stream()
                .filter(l -> l.getCreatedAt() != null && !l.getCreatedAt().toLocalDate().isBefore(from))
                .filter(l -> status == null || status.isEmpty() || status.equalsIgnoreCase(l.getStatus()))
                .limit(cap)
                .map(l -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", l.getId());
                    m.put("executionId", l.getExecutionId());
                    m.put("workflowCode", l.getWorkflowCode());
                    m.put("versionNumber", l.getVersionNumber());
                    m.put("status", l.getStatus());
                    m.put("durationMs", l.getExecutionDuration());
                    m.put("errorMessage", l.getErrorMessage());
                    m.put("apiKeyPrefix", l.getApiKeyPrefix());
                    m.put("startTime", l.getStartTime() == null ? null : l.getStartTime().toString());
                    m.put("createdAt", l.getCreatedAt() == null ? null : l.getCreatedAt().toString());
                    return m;
                })
                .collect(Collectors.toList());
    }

    /** 对外 API 渠道的调用日志（按时间倒序） */
    private List<GaiaWorkflowLog> queryApiLogs(String workflowCode) {
        QueryWrapper<GaiaWorkflowLog> q = new QueryWrapper<>();
        q.eq("invoke_channel", "api");
        if (workflowCode != null) {
            q.eq("workflow_code", workflowCode);
        }
        q.orderByDesc("created_at");
        return logService.list(q);
    }

    // ---------- 内部工具 ----------

    private static class Bucket {
        int calls = 0;
        int success = 0;
        int failed = 0;
        long durationSum = 0;
    }

    private String deriveRequestSchema(String workflowData) {
        JSONObject props = new JSONObject();
        try {
            if (workflowData != null && JSONUtil.isJson(workflowData)) {
                JSONObject root = JSONUtil.parseObj(workflowData);
                JSONArray nodes = root.getJSONArray("nodes");
                if (nodes != null) {
                    for (Object o : nodes) {
                        JSONObject node = (JSONObject) o;
                        if ("start".equals(node.getStr("type"))) {
                            JSONObject data = node.getJSONObject("data");
                            if (data != null) {
                                JSONObject inputs = data.getJSONObject("inputs");
                                JSONObject out = data.getJSONObject("outputs");
                                JSONObject src = (inputs != null && inputs.getJSONObject("properties") != null)
                                        ? inputs.getJSONObject("properties")
                                        : (out != null ? out.getJSONObject("properties") : null);
                                if (src != null) {
                                    for (String key : src.keySet()) {
                                        JSONObject p = src.getJSONObject(key);
                                        props.set(key, new JSONObject()
                                                .set("type", p != null ? p.getStr("type", "string") : "string")
                                                .set("description", p != null ? p.getStr("description", "") : ""));
                                    }
                                }
                            }
                            break;
                        }
                    }
                }
            }
        } catch (Exception ignored) {
            // 解析失败则回退到通用契约
        }
        if (props.isEmpty()) {
            props.set("inputs", new JSONObject().set("type", "object").set("description", "工作流输入参数（结构由工作流决定）"));
        }
        return JSONUtil.toJsonStr(new JSONObject().set("type", "object").set("properties", props));
    }

    private static String maskKey(String key) {
        if (key == null || key.length() <= 6) return "****";
        return key.substring(0, 6) + "****";
    }

    private static long percentile(List<Long> sorted, double p) {
        if (sorted.isEmpty()) return 0;
        int idx = (int) Math.ceil(p * sorted.size()) - 1;
        if (idx < 0) idx = 0;
        if (idx >= sorted.size()) idx = sorted.size() - 1;
        return sorted.get(idx);
    }
}
