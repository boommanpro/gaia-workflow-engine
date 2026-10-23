package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolGroup;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * web_search —— 联网搜索（Tavily）。
 *
 * <p>密钥来源（前端「工具定义 → web_search → 配置」优先）：
 * agent_config 表 {@code tool:web_search} 的 configData.apiKey → 环境变量 TAVILY_API_KEY 兜底。
 * 不复用 harness 内置 WebSearchTool —— 它只读环境变量，无法承接前端配置的密钥。
 * 默认关闭（工具定义 seed 以 disabled 落库），配好密钥后自行开启。</p>
 */
@Slf4j
@Component
public class WebSearchToolExecutor implements ToolExecutor {

    private static final String CONFIG_KEY = "tool:web_search";
    private static final String TAVILY_API = "https://api.tavily.com/search";
    private static final long TIMEOUT_MS = 30_000;

    private final AgentConfigService configService;

    public WebSearchToolExecutor(AgentConfigService configService) {
        this.configService = configService;
    }

    @Override
    public String name() {
        return "web_search";
    }

    @Override
    public ToolGroup group() {
        return ToolGroup.COMMON;
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "联网搜索：关键词 → 标题+摘要+链接（密钥在 Agent 配置中心 · 工具定义页配置）";
    }

    @Override
    public boolean concurrencySafe() {
        return true;
    }

    /** 密钥解析：DB 配置优先（改完即生效），环境变量兜底（部署态注入） */
    private String resolveApiKey() {
        try {
            AgentConfig cfg = configService.getOne(new QueryWrapper<AgentConfig>()
                .eq("config_key", CONFIG_KEY).last("LIMIT 1"));
            if (cfg != null && cfg.getConfigData() != null) {
                String key = JSONUtil.parseObj(cfg.getConfigData()).getStr("apiKey");
                if (key != null && !key.isBlank()) return key.trim();
            }
        } catch (Exception e) {
            log.warn("[web_search] 读取密钥配置失败，回退环境变量：{}", e.getMessage());
        }
        String env = System.getenv("TAVILY_API_KEY");
        return env == null || env.isBlank() ? null : env.trim();
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String query = args.getStr("query");
        if (query == null || query.isBlank()) {
            return ToolResult.invalidArgs(null, "query is required");
        }
        String apiKey = resolveApiKey();
        if (apiKey == null) {
            return ToolResult.fail(
                new JSONObject().set("error", "TAVILY_API_KEY is not set").toString(),
                "未配置 Tavily 密钥：请在 Agent 配置中心 · 工具定义 → web_search → 配置 里填写 API Key 并启用该工具");
        }
        Integer maxResults = args.getInt("max_results");
        if (maxResults == null) maxResults = args.getInt("maxResults");
        if (maxResults == null || maxResults <= 0 || maxResults > 10) maxResults = 5;

        try {
            String body = new JSONObject()
                .set("query", query.strip())
                .set("max_results", maxResults)
                .toString();
            HttpURLConnection conn = (HttpURLConnection) new URL(TAVILY_API).openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(10_000);
            conn.setReadTimeout((int) TIMEOUT_MS);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + apiKey);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }
            int code = conn.getResponseCode();
            String respBody = readAll(conn, code >= 400);
            conn.disconnect();
            if (code != 200) {
                log.warn("[web_search] Tavily HTTP {}: {}", code, respBody.substring(0, Math.min(200, respBody.length())));
                return ToolResult.fail(
                    new JSONObject().set("error", "tavily http " + code).toString(),
                    "搜索服务返回 HTTP " + code + "（密钥无效或额度不足，请检查配置）");
            }
            JSONArray results = JSONUtil.parseObj(respBody).getJSONArray("results");
            StringBuilder sb = new StringBuilder();
            if (results == null || results.isEmpty()) {
                sb.append("No results.");
            } else {
                for (Object o : results) {
                    JSONObject r = (JSONObject) o;
                    sb.append(r.getStr("title", "")).append('\n')
                      .append(r.getStr("content", "")).append('\n')
                      .append(r.getStr("url", "")).append("\n\n");
                }
            }
            return ToolResult.ok(new JSONObject().set("results", sb.toString().trim()).toString());
        } catch (Exception e) {
            log.warn("[web_search] 调用失败：{}", e.getMessage());
            return ToolResult.fail(
                new JSONObject().set("error", e.getMessage()).toString(),
                "搜索请求失败：" + e.getMessage());
        }
    }

    private String readAll(HttpURLConnection conn, boolean error) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
            error ? conn.getErrorStream() : conn.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }
}
