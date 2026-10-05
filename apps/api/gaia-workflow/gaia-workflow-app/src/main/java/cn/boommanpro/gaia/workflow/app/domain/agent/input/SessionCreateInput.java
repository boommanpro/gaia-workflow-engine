package cn.boommanpro.gaia.workflow.app.domain.agent.input;

import lombok.Data;

/**
 * 新建会话请求
 */
@Data
public class SessionCreateInput {
    private String title;
    /** 会话空间：chat / work，默认 chat */
    private String scope;
    /** 所属工作文件夹（scope=work 时生效，缺省归入「默认空间」） */
    private Long folderId;
}
