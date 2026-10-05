package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Agent 对话会话
 */
@Data
@TableName("agent_session")
public class AgentSession {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 会话标识（浏览器生成的 UUID）
     */
    @TableField("session_key")
    private String sessionKey;

    /**
     * 会话标题
     */
    @TableField("title")
    private String title;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    /**
     * 是否删除（0-未删除，1-已删除）
     */
    @TableField("is_deleted")
    @TableLogic
    private Integer isDeleted;

    /**
     * 调试信息 JSON（前端持久化的 debug entries）
     */
    @TableField("debug_data")
    private String debugData;

    // ===== 工作空间 / 列表增强（Codex 风格三区） =====

    /**
     * 会话所属空间：chat（对话）/ work（工作空间），两套逻辑隔离
     */
    @TableField("scope")
    private String scope;

    /**
     * 所属工作文件夹（agent_work_folder.id），null 表示未归档到文件夹
     */
    @TableField("folder_id")
    private Long folderId;

    /**
     * 置顶标记（0-否，1-是）
     */
    @TableField("pinned")
    private Integer pinned;

    /**
     * 归档标记（0-否，1-是）
     */
    @TableField("archived")
    private Integer archived;

    // ===== 人工审查标记（用于会话质量分析和 event loop） =====

    /** 质量评分：good / bad / null（未标记） */
    @TableField("review_rating")
    private String reviewRating;

    /** 问题描述（人工填写，哪里不好） */
    @TableField("review_issue")
    private String reviewIssue;

    /** 状态标签：pending（默认）/ analyzing / fixed / ignored */
    @TableField("review_status")
    private String reviewStatus;

    /** 修复建议（给 coding agent 的指令） */
    @TableField("review_fix_note")
    private String reviewFixNote;
}
