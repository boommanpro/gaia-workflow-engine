package cn.boommanpro.gaia.workflow.base.type;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.util.StringUtils;

@Getter
@AllArgsConstructor
public enum NodeTypeEnum  {

    START("start", "开始节点"),
    END("end", "结束节点"),
    CONDITION("condition", "条件节点"),
    CODE("code", "代码节点"),
    NOTE("note", "注释节点"),
    GROUP("group", "组节点，用于标志含义"),
    COMMENT("comment", "评论节点"),
    BRANCHES("branches", "分支节点"),
    STRING_FORMAT("string-format", "字符串格式化节点"),
    VARIABLE("variable", "变量节点"),
    HTTP("http", "HTTP请求节点"),
    LLM("llm", "LLM节点"),
    LOOP("loop", "循环节点"),
    BLOCK_START("block-start", "块开始节点"),
    BLOCK_END("block-end", "块结束节点"),
    CONTINUE("continue", "继续节点"),
    BREAK("break", "中断节点"),
    CHAIN("chain", "链节点"),
    WORKFLOW("workflow", "工作流节点"),
    ASSIGNEE("assignee","负责人节点")

    ;

    private final String code;
    private final String description;

    private static final NodeTypeEnum[] NO_PARSE = new NodeTypeEnum[]{
            GROUP, NOTE, COMMENT,ASSIGNEE
    };

    public static NodeTypeEnum of(String type) {
        for (NodeTypeEnum nodeTypeEnum : NodeTypeEnum.values()) {
            if (nodeTypeEnum.getCode().equals(type)) {
                return nodeTypeEnum;
            }
        }
        return null;
    }

    public static boolean notParse(String type) {
        if (!StringUtils.hasText(type)) {
            return true;
        }
        for (NodeTypeEnum nodeTypeEnum : NO_PARSE) {
            if (nodeTypeEnum.getCode().equals(type)) {
                return true;
            }
        }
        return false;
    }
}
