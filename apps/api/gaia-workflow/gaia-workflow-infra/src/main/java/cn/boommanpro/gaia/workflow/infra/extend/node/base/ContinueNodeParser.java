package cn.boommanpro.gaia.workflow.infra.extend.node.base;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNodeParser;
import cn.hutool.json.JSONObject;

/**
 * 继续节点解析器
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17
 */
public class ContinueNodeParser extends BaseNodeParser<ContinueNode> {

    @Override
    public ContinueNode buildInstance(JSONObject nodeJSONObject, GaiaWorkflow workflow) {
        return new ContinueNode();
    }
}

