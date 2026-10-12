package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/**
 * 模型条目（owb 式「渠道+条目」两层里的条目层，2026-10-11）。
 * 用户可配多个模型，会话可绑定其中一个（agent_session.model_id，NULL=跟随全局默认）。
 * 渠道层（provider）暂以 base_url+api_key 快照内联在条目上（owb 的「压平」手法，
 * 执行路径免 JOIN）；后续多条目共享渠道时再拆表。
 */
@Data
@TableName("llm_model")
public class LlmModel {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /** 用户可见唯一名（会话绑定/全局默认按它引用） */
    @TableField("display_name")
    private String displayName;

    /** 厂商标识：openai/qwen/glm/anthropic/deepseek/openrouter/ollama/custom（思考参数映射用） */
    @TableField("vendor")
    private String vendor;

    @TableField("base_url")
    private String baseUrl;

    @TableField("api_key")
    private String apiKey;

    /** 上游模型 ID（如 qwen3-max / glm-4.6 / deepseek-chat） */
    @TableField("model_id")
    private String modelId;

    /** 思考档位条目级覆盖：auto/off/low/medium/high；空 = 跟随全局 */
    @TableField("thinking_override")
    private String thinkingOverride;

    @TableField("max_tokens")
    private Integer maxTokens;

    @TableField("temperature")
    private Double temperature;

    /** 厂商私有参数逃生口（JSON），优先级最高 */
    @TableField("extra_body")
    private String extraBody;

    @TableField("enabled")
    private Integer enabled;

    @TableField("sort_order")
    private Integer sortOrder;

    @TableField("created_at")
    private String createdAt;

    @TableField("updated_at")
    private String updatedAt;
}
