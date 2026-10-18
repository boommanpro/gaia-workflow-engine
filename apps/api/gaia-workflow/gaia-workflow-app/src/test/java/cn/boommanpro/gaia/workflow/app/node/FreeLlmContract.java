package cn.boommanpro.gaia.workflow.app.node;

import java.net.HttpURLConnection;
import java.net.URL;

/**
 * 测试用免费 LLM 端点契约（OpenAI 兼容）。
 * <p>
 * 仅可调用 {@link #MODEL} 这一个免费模型；key 无其他额度，可安全入库/入测试。
 * 真实 API 用例一律先 {@link #reachable()} 做连通性假设，离线环境优雅跳过。
 */
public final class FreeLlmContract {

    public static final String API_HOST = "https://www.dmxapi.cn/v1";
    public static final String MODEL = "glm-4-flash";
    public static final String API_KEY = "sk-SnEd69fzfoB1Ffwzd1pVRXkxzD7dSvpeyFtcdiJWetZLnS39";

    private FreeLlmContract() {
    }

    /**
     * 3 秒探测端点可达性（不消耗对话额度，GET /models）。
     */
    public static boolean reachable() {
        try {
            HttpURLConnection conn = (HttpURLConnection) new URL(API_HOST + "/models").openConnection();
            conn.setConnectTimeout(3000);
            conn.setReadTimeout(3000);
            conn.setRequestProperty("Authorization", "Bearer " + API_KEY);
            int code = conn.getResponseCode();
            conn.disconnect();
            return code >= 200 && code < 500;
        } catch (Exception e) {
            return false;
        }
    }
}
