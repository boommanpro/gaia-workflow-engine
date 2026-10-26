package cn.boommanpro.gaia.workflow.app.node;

import java.net.HttpURLConnection;
import java.net.URL;

/**
 * 测试用免费 LLM 端点契约（OpenAI 兼容）。
 * <p>
 * 凭证从环境变量 {@code GAIA_LLM_API_KEY} 读取，不入库；未设置时 {@link #reachable()}
 * 恒为 false，真实 API 用例优雅跳过。reachable() 同时把 401/403 视为不可达——
 * key 失效与网络不通同等对待（曾实证死 key 触发 401 仍被 200-499 口径放行、用例真跑失败）。
 */
public final class FreeLlmContract {

    public static final String API_HOST = "https://www.dmxapi.cn/v1";
    public static final String MODEL = "glm-4-flash";
    public static final String API_KEY = System.getenv().getOrDefault("GAIA_LLM_API_KEY", "");

    private FreeLlmContract() {
    }

    /**
     * 3 秒探测「端点可达且凭证可用」（GET /models）。
     * 无 key、网络不通、401/403（key 无效）一律 false，真实 API 用例据此跳过。
     */
    public static boolean reachable() {
        if (API_KEY == null || API_KEY.isBlank()) {
            return false;
        }
        try {
            HttpURLConnection conn = (HttpURLConnection) new URL(API_HOST + "/models").openConnection();
            conn.setConnectTimeout(3000);
            conn.setReadTimeout(3000);
            conn.setRequestProperty("Authorization", "Bearer " + API_KEY);
            int code = conn.getResponseCode();
            conn.disconnect();
            return code >= 200 && code < 300;
        } catch (Exception e) {
            return false;
        }
    }
}
