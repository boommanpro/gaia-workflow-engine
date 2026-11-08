package cn.boommanpro.gaia.workflow.app.node;

import java.net.HttpURLConnection;
import java.net.URL;

/**
 * 测试用免费 LLM 端点契约（OpenAI 兼容）。
 * <p>
 * 凭证不入库：从环境变量 GAIA_LLM_API_KEY 读取（与主应用共用同一变量，见 application.yml）。
 * 仅可调用 {@link #MODEL} 这一个免费模型；未配置凭证或端点不可达时，
 * 真实 API 用例经 {@link #reachable()} 连通性假设优雅跳过。
 */
public final class FreeLlmContract {

    public static final String API_HOST = "https://www.dmxapi.cn/v1";
    public static final String MODEL = "glm-4-flash";
    /** 缺省空串：未注入凭证时真实 API 用例自动跳过。 */
    public static final String API_KEY = System.getenv().getOrDefault("GAIA_LLM_API_KEY", "");

    private FreeLlmContract() {
    }

    /**
     * 3 秒探测端点可达性（不消耗对话额度，GET /models）。
     * 401/403 视为凭证不可用（如环境变量配的是其他厂商 key），同样跳过真实用例。
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
            return code >= 200 && code < 500 && code != 401 && code != 403;
        } catch (Exception e) {
            return false;
        }
    }
}
