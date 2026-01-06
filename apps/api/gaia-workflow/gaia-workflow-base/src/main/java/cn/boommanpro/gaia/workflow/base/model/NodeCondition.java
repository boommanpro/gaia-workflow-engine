package cn.boommanpro.gaia.workflow.base.model;

import java.util.Map;

/**
 * 节点条件接口
 * 用于控制节点的执行逻辑
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
public interface NodeCondition {
    /**
     * 检查条件是否满足
     *
     * @param chain 链对象
     * @param nodeContext 节点上下文
     * @param prevNodeResult 前一个节点的执行结果
     * @return 是否满足条件
     */
    boolean check(Chain chain, Object nodeContext, Map<String, Object> prevNodeResult);
}

