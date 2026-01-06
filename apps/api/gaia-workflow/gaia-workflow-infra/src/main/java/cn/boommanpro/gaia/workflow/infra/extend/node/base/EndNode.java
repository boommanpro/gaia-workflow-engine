package cn.boommanpro.gaia.workflow.infra.extend.node.base;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNode;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;

@Slf4j
public class EndNode extends BaseNode {

    @Override
    public Map<String, Object> execute(Chain chain) {
        return chain.getMemory();
    }

    @Override
    protected Map<String, Object> getParametersData(Chain chain) {
        return chain.getMemory();
    }
}
