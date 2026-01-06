package cn.boommanpro.gaia.workflow.base.node;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.base.model.ChainNode;
import cn.hutool.json.JSONObject;

public interface NodeParser {
    ChainNode parse(JSONObject nodeJSONObject, GaiaWorkflow workflow);
}
