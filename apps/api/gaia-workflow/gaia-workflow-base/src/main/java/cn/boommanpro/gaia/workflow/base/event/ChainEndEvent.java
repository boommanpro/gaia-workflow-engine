package cn.boommanpro.gaia.workflow.base.event;

import cn.boommanpro.gaia.workflow.base.model.Chain;

/**
 * 链执行结束事件
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
public class ChainEndEvent extends BaseChainEvent {

    public ChainEndEvent(Chain chain) {
        super(chain);
    }

    @Override
    public String toString() {
        return "ChainEndEvent{" +
                "chainId=" + (chain != null ? chain.getId() : "null") +
                ", timestamp=" + timestamp +
                '}';
    }
}

