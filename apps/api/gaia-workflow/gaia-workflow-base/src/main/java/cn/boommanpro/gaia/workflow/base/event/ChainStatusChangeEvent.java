package cn.boommanpro.gaia.workflow.base.event;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.type.ChainStatus;

/**
 * 链状态变化事件
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
public class ChainStatusChangeEvent extends BaseChainEvent {

    private final ChainStatus newStatus;
    private final ChainStatus oldStatus;

    public ChainStatusChangeEvent(Chain chain, ChainStatus newStatus, ChainStatus oldStatus) {
        super(chain);
        this.newStatus = newStatus;
        this.oldStatus = oldStatus;
    }

    public ChainStatus getNewStatus() {
        return newStatus;
    }

    public ChainStatus getOldStatus() {
        return oldStatus;
    }

    @Override
    public String toString() {
        return "ChainStatusChangeEvent{" +
                "chainId=" + (chain != null ? chain.getId() : "null") +
                ", newStatus=" + newStatus +
                ", oldStatus=" + oldStatus +
                ", timestamp=" + timestamp +
                '}';
    }
}

