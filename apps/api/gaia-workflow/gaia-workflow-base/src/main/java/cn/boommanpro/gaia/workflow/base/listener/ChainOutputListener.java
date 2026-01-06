package cn.boommanpro.gaia.workflow.base.listener;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.model.ChainNode;

/**
 * 链输出监听器接口
 * 用于监听节点的输出信息
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
public interface ChainOutputListener {
    /**
     * 当节点产生输出时调用
     *
     * @param chain 链对象
     * @param node  节点对象
     * @param output 输出内容
     */
    void onOutput(Chain chain, ChainNode node, Object output);
}

