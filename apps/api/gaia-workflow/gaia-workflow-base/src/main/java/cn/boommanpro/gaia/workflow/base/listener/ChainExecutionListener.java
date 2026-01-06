package cn.boommanpro.gaia.workflow.base.listener;

import cn.boommanpro.gaia.workflow.base.model.ChainNodeExecuteInfo;
import cn.boommanpro.gaia.workflow.base.type.ChainStatus;

import java.util.Map;

/**
 * 工作流执行监听器接口
 * 用于监听工作流执行过程中的状态变化
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 17:00
 */
public interface ChainExecutionListener {

    /**
     * 当工作流开始执行时调用
     *
     * @param chainId 工作流ID
     */
    default void onExecutionStart(String chainId) {
    }

    /**
     * 当节点状态发生变化时调用
     *
     * @param chainId 工作流ID
     * @param nodeId 节点ID
     * @param executeInfo 节点执行信息
     */
    default void onNodeStatusChanged(String chainId, String nodeId, ChainNodeExecuteInfo executeInfo) {
    }

    /**
     * 当工作流状态发生变化时调用
     *
     * @param chainId 工作流ID
     * @param status 工作流状态
     */
    default void onChainStatusChanged(String chainId, ChainStatus status) {
    }

    /**
     * 当工作流执行完成时调用
     *
     * @param chainId 工作流ID
     * @param result 执行结果
     * @param exception 异常信息（如果有）
     */
    default void onExecutionComplete(String chainId, Map<String, Object> result, Exception exception) {
    }

    /**
     * 定期进度更新回调
     *
     * @param chainId 工作流ID
     * @param executeInfoMap 所有节点的执行信息
     * @param completedNodes 已完成节点数
     * @param totalNodes 总节点数
     */
    default void onProgressUpdate(String chainId, Map<String, ChainNodeExecuteInfo> executeInfoMap,
                                 int completedNodes, int totalNodes) {
    }
}

