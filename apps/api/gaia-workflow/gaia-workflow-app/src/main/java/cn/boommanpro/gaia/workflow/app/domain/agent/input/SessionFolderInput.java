package cn.boommanpro.gaia.workflow.app.domain.agent.input;

import lombok.Data;

/**
 * 会话归入工作文件夹请求（folderId 为 null 表示移出文件夹）
 */
@Data
public class SessionFolderInput {
    private Long folderId;
}
