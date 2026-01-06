package cn.boommanpro.gaia.workflow.infra.extend.node.loop;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNode;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Map;

/**
 * 块结束节点，用于标记循环或条件块的结束
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17
 */
@Slf4j
@Data
@EqualsAndHashCode(callSuper = true)
public class BlockEndNode extends BaseNode {

    @Override
    public Map<String, Object> execute(Chain chain) {
        log.debug("Executing BlockEnd node: {}", getId());
        // BlockEnd节点本身不执行任何逻辑，只是一个标记
        return chain.getMemory();
    }

    @Override
    public NodeTypeEnum getNodeType() {
        return NodeTypeEnum.BLOCK_END;
    }

    @Override
    public List<Parameter> getOutputParameters() {
        return null;
    }
}

