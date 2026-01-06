package cn.boommanpro.gaia.workflow.infra.extend.utils;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.base.model.ChainNode;

import cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum;
import cn.boommanpro.gaia.workflow.base.node.ChainParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.condition.ConditionNode;
import cn.boommanpro.gaia.workflow.infra.extend.node.base.ContinueNode;
import cn.boommanpro.gaia.workflow.infra.extend.node.llm.LlmNode;
import cn.boommanpro.gaia.workflow.infra.extend.node.loop.BlockEndNode;
import cn.boommanpro.gaia.workflow.infra.extend.node.loop.BlockStartNode;
import cn.boommanpro.gaia.workflow.infra.extend.node.loop.BreakNode;
import cn.boommanpro.gaia.workflow.infra.extend.node.loop.LoopNode;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;

/**
 * 块解析工具类，用于将LoopNode中的Block转换为ChainNode
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17
 */
@Slf4j
public class BlockParserUtil {

    private static final ChainParser chainParser = new ChainParser();

    /**
     * 将LoopNode.Block转换为ChainNode
     */
    public static ChainNode convertBlockToNode(LoopNode.Block block, GaiaWorkflow workflow) {
        try {
            // 将Block转换为JSONObject格式
            JSONObject blockJson = convertBlockToJSONObject(block);

            // 根据类型获取对应的解析器
            String type = block.getType();
            NodeTypeEnum nodeType = NodeTypeEnum.of(type);

            if (nodeType == null) {
                log.warn("Unknown node type: {}", type);
                return null;
            }

            // 使用对应的解析器创建节点
            return chainParser.getNodeParserMap().get(type).parse(blockJson, workflow);

        } catch (Exception e) {
            log.error("Error converting block to node: " + block.getId(), e);
            return null;
        }
    }

    /**
     * 将Block转换为JSONObject
     */
    private static JSONObject convertBlockToJSONObject(LoopNode.Block block) {
        JSONObject jsonObject = new JSONObject();
        jsonObject.set("id", block.getId());
        jsonObject.set("type", block.getType());

        if (block.getMeta() != null) {
            jsonObject.set("meta", block.getMeta());
        }

        if (block.getData() != null) {
            jsonObject.set("data", block.getData());
        }

        return jsonObject;
    }

    /**
     * 创建简单的节点实例（用于无法解析的情况）
     */
    public static ChainNode createSimpleNode(String id, String type) {
        switch (type) {
            case "block-start":
                return new BlockStartNode();
            case "block-end":
                return new BlockEndNode();
            case "continue":
                return new ContinueNode();
            case "break":
                return new BreakNode();
            case "llm":
                LlmNode llmNode = new LlmNode();
                llmNode.setId(id);
                return llmNode;
            case "condition":
                ConditionNode conditionNode = new ConditionNode();
                conditionNode.setId(id);
                return conditionNode;
            default:
                log.warn("Unsupported simple node type: {}", type);
                return null;
        }
    }
}

