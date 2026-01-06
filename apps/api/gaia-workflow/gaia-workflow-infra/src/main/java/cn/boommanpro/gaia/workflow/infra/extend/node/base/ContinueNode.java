package cn.boommanpro.gaia.workflow.infra.extend.node.base;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNode;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;

/**
 * 继续节点，用于跳过当前循环的剩余部分，直接进入下一次循环
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17
 */
@Slf4j
@Data
@EqualsAndHashCode(callSuper = true)
public class ContinueNode extends BaseNode {

    @Override
    public Map<String, Object> execute(Chain chain) {
        log.debug("Executing Continue node: {}", getId());

        // 设置继续标记到chain的memory中
        chain.getMemory().put("loop.control", "continue");

        return new HashMap<>();
    }

    @Override
    public NodeTypeEnum getNodeType() {
        return NodeTypeEnum.CONTINUE;
    }
}

