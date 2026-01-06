package cn.boommanpro.gaia.workflow.infra.extend.node.base;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.loop.BlockEndNode;
import cn.hutool.json.JSONObject;

/**
 * 块结束节点解析器
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17
 */
public class BlockEndNodeParser extends BaseNodeParser<BlockEndNode> {

    @Override
    public BlockEndNode buildInstance(JSONObject nodeJSONObject, GaiaWorkflow workflow) {
        return new BlockEndNode();
    }
}

