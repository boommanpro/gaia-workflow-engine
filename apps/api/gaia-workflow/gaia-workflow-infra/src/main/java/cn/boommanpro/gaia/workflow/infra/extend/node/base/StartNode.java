package cn.boommanpro.gaia.workflow.infra.extend.node.base;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNode;
import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;

@Slf4j
public class StartNode extends BaseNode {

    @Override
    public Map<String, Object> execute(Chain chain) {
        return new HashMap<>(chain.getMemory());
    }

    @Override
    protected Map<String, Object> getParametersData(Chain chain) {
        return new HashMap<>(chain.getMemory());
    }
}
