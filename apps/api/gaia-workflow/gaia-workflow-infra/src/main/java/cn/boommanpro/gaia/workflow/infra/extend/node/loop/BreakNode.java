package cn.boommanpro.gaia.workflow.infra.extend.node.loop;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNode;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;

/**
 * 中断节点，用于跳出当前循环
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17
 */
@Slf4j
@Data
@EqualsAndHashCode(callSuper = true)
public class BreakNode extends BaseNode {

    @Override
    public Map<String, Object> execute(Chain chain) {
        log.debug("Executing Break node: {}", getId());

        // 设置中断标记到chain的memory中
        chain.getMemory().put("loop.control", "break");

        return new HashMap<>();
    }

    @Override
    public NodeTypeEnum getNodeType() {
        return NodeTypeEnum.BREAK;
    }
}

