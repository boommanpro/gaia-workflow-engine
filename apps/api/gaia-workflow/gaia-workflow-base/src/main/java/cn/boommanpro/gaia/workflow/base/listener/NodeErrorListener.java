package cn.boommanpro.gaia.workflow.base.listener;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.model.ChainNode;

import java.util.Map;

/**
 * 节点错误监听器接口
 * 用于监听节点执行过程中的错误
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
public interface NodeErrorListener {
    /**
     * 当节点执行发生错误时调用
     *
     * @param error       错误对象
     * @param node        节点对象
     * @param nodeResult  节点执行结果
     * @param chain       链对象
     */
    void onError(Throwable error, ChainNode node, Map<String, Object> nodeResult, Chain chain);
}

