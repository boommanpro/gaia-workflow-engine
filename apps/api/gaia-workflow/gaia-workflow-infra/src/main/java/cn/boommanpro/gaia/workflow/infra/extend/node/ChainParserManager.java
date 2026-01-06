package cn.boommanpro.gaia.workflow.infra.extend.node;

import cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum;
import cn.boommanpro.gaia.workflow.base.node.ChainParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.base.*;
import cn.boommanpro.gaia.workflow.infra.extend.node.code.CodeNodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.condition.ConditionNodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.http.HttpNodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.llm.LlmNodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.loop.LoopNodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.stringformat.StringFormatCodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.variable.VariableNodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.workflow.WorkflowNodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.branch.BranchesNodeParser;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;

/**
 * 代码功能
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17 11:31
 */
@Component
public class ChainParserManager {



    @PostConstruct
    public void initParserMap() {
        ChainParser.registerNodeParser(NodeTypeEnum.START.getCode(), new StartNodeParser());
        ChainParser.registerNodeParser(NodeTypeEnum.END.getCode(), new EndNodeParser());
        ChainParser.registerNodeParser(NodeTypeEnum.CODE.getCode(), new CodeNodeParser());
        ChainParser.registerNodeParser(NodeTypeEnum.BRANCHES.getCode(), new BranchesNodeParser());
        ChainParser.registerNodeParser(NodeTypeEnum.STRING_FORMAT.getCode(), new StringFormatCodeParser());
        ChainParser.registerNodeParser(NodeTypeEnum.VARIABLE.getCode(), new VariableNodeParser());
        ChainParser.registerNodeParser(NodeTypeEnum.HTTP.getCode(), new HttpNodeParser());
        ChainParser.registerNodeParser(NodeTypeEnum.LLM.getCode(), new LlmNodeParser());
        ChainParser.registerNodeParser(NodeTypeEnum.CONDITION.getCode(), new ConditionNodeParser());
        ChainParser.registerNodeParser(NodeTypeEnum.LOOP.getCode(), new LoopNodeParser());
        ChainParser.registerNodeParser(NodeTypeEnum.BLOCK_START.getCode(), new BlockStartNodeParser());
        ChainParser.registerNodeParser(NodeTypeEnum.BLOCK_END.getCode(), new BlockEndNodeParser());
        ChainParser.registerNodeParser(NodeTypeEnum.CONTINUE.getCode(), new ContinueNodeParser());
        ChainParser.registerNodeParser(NodeTypeEnum.BREAK.getCode(), new BreakNodeParser());
        ChainParser.registerNodeParser(NodeTypeEnum.WORKFLOW.getCode(), new WorkflowNodeParser());
    }
}
