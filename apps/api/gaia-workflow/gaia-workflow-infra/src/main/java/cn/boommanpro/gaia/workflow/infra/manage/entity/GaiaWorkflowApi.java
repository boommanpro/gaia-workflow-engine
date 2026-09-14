package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 工作流「发布为 API」主表。
 *
 * 一条记录 = 一个对外可调用的 API：绑定某个 workflow 的当前生效版本，
 * 拥有独立的调用路径 {@code /api/v1/wf/{workflowCode}} 与 API Key 鉴权。
 */
@Data
@TableName("gaia_workflow_api")
public class GaiaWorkflowApi {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /** 工作流编码（与 gaia_workflow.workflow_code 一一对应） */
    @TableField("workflow_code")
    private String workflowCode;

    /** API 名称（对外展示） */
    @TableField("api_name")
    private String apiName;

    /** API 描述 */
    @TableField("api_desc")
    private String apiDesc;

    /** 发布时锁定的版本号 */
    @TableField("version_number")
    private String versionNumber;

    /** 对外调用路径，例如 /api/v1/wf/demo001 */
    @TableField("api_path")
    private String apiPath;

    /** API Key（明文存储，仅发布/重置时返回一次；列表/详情返回脱敏值） */
    @TableField("api_key")
    private String apiKey;

    /** 发布状态：0-未发布(草稿) / 1-已发布 */
    @TableField("status")
    private Integer status;

    /** 请求参数契约（JSON：{ type, properties }） */
    @TableField("request_schema")
    private String requestSchema;

    /** 响应参数契约（JSON：{ type, properties }） */
    @TableField("response_schema")
    private String responseSchema;

    /** 错误码说明（JSON 数组） */
    @TableField("error_codes")
    private String errorCodes;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableField("is_deleted")
    @TableLogic
    private Integer isDeleted;
}
