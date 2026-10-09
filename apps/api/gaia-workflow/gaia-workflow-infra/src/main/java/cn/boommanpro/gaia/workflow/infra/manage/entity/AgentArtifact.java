package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Agent 产物（Artifact 一等实体）。
 *
 * <p>把 AI 的产出从「事件流里的一次性 payload」升级为有身份、有状态机、
 * 可持久化的实体。四种 type：</p>
 * <ul>
 *   <li>{@code workflow} —— 画布草稿/落版产物，每会话一行（artifact_key = sessionKey:workflow）</li>
 *   <li>{@code plan} —— 执行计划，每会话一行（artifact_key = sessionKey:plan）</li>
 *   <li>{@code test_report} —— 试运行证据（runWorkflow / runNode），追加式</li>
 *   <li>{@code release} —— 发布收口记录（publish 成功），追加式</li>
 * </ul>
 */
@Data
@TableName("agent_artifact")
public class AgentArtifact {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 对外稳定标识：会话级产物为 "{sessionKey}:{type}"，追加式为 "art_xxx"。
     * 会话级产物据此 upsert（内容更新 = version 递增），追加式每次都是新行。
     */
    @TableField("artifact_key")
    private String artifactKey;

    @TableField("session_key")
    private String sessionKey;

    /** 产出它的那次运行（可空：非 run 上下文的更新） */
    @TableField("run_id")
    private String runId;

    /** workflow | plan | test_report | release */
    @TableField("type")
    private String type;

    /** streaming | stable | applied | discarded | proposed | completed | published */
    @TableField("status")
    private String status;

    @TableField("title")
    private String title;

    /** 一句话 delta / 结论（卡片副标题） */
    @TableField("summary")
    private String summary;

    /** JSON，schema 按 type 定义 */
    @TableField("payload")
    private String payload;

    /** 同一 artifact 的第 N 次内容更新，从 1 开始 */
    @TableField("version")
    private Integer version;

    /** 产出引擎：local | ark（可空） */
    @TableField("engine")
    private String engine;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableField("is_deleted")
    @TableLogic
    private Integer isDeleted;
}
