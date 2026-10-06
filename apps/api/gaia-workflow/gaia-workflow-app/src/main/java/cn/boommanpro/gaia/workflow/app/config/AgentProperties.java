package cn.boommanpro.gaia.workflow.app.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Agent 配置（application.yml 默认值，可被数据库 agent_config 表覆盖）
 */
@Data
@Component
@ConfigurationProperties(prefix = "agent")
public class AgentProperties {

    private Llm llm = new Llm();
    private History history = new History();
    private Ark ark = new Ark();

    @Data
    public static class Llm {
        private String apiHost = "http://localhost:1234/v1";
        private String apiKey = "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
        private String model = "qwen/qwen3-4b-2507";
        private double temperature = 0.5;
        /** 最大输出 token 数（0 表示不限制） */
        private int maxTokens = 4096;
        /** 模型上下文窗口大小（用于历史消息截断参考） */
        private int contextWindow = 32768;
    }

    @Data
    public static class History {
        private int maxMessages = 20;
    }

    /**
     * 火山方舟 Managed Agents 接入配置（application.yml 兜底，可被 agent_config 的
     * provider_config:ark 覆盖）。engine=ark 的 Agent 运行时从这里取连接参数。
     */
    @Data
    public static class Ark {
        private String baseUrl = "https://ark.cn-beijing.volces.com/api/v3";
        private String apiKey = "";
        /** 云沙箱环境 ID（形如 env-2026...-xxxx），在方舟控制台创建 */
        private String environmentId = "";
        /** 默认模型（创建方舟 Agent 时使用） */
        private String defaultModelId = "";
        /**
         * 默认走方舟托管的 Agent 定义 ID（形如 ark-assistant）。
         * 三要素（apiKey/environmentId/defaultAgentId）齐备时，会话运行默认走方舟引擎；
         * 任一缺失则回退 local 引擎的默认 Agent。
         */
        private String defaultAgentId = "";
        private int connectTimeoutMs = 10000;
        private int readTimeoutMs = 300000;
    }
}
