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
    private Compaction compaction = new Compaction();
    private Spill spill = new Spill();

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
     * 上下文压缩（对齐 dsh compaction：确定性剪枝 → 模型摘要，配对完整性保持）。
     * 触发条件：估算上下文 token &gt; contextWindow × triggerRatio。
     */
    @Data
    public static class Compaction {
        private boolean enabled = true;
        /** 触发比例（相对 contextWindow） */
        private double triggerRatio = 0.7;
        /** 摘要后至少保留的最近消息条数（不参与摘要） */
        private int keepRecentMessages = 8;
        /** 触发摘要所需的最小消息数（太短的对话不值得摘要） */
        private int minMessagesToSummarize = 12;
        /** 老工具结果超过此字符数即剪枝（保留最近 keepRecentToolResults 条完整） */
        private int pruneToolResultChars = 1200;
        /** 保持完整的老工具结果条数 */
        private int keepRecentToolResults = 6;
        /** 摘要请求的最大输出 token */
        private int summaryMaxTokens = 600;
    }

    /**
     * 大结果 spill（对齐 dsh spill-policy）：工具结果超过 inline 上限时，
     * 模型只看 head/tail 预览 + 取回指引，完整内容留在事件日志与会话历史里。
     */
    @Data
    public static class Spill {
        private boolean enabled = true;
        /** 进入模型上下文的单条工具结果上限（字符） */
        private int maxInlineChars = 12000;
        /** 预览保留的头部字符数 */
        private int headChars = 8000;
        /** 预览保留的尾部字符数 */
        private int tailChars = 2000;
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
