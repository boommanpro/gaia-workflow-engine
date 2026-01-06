package cn.boommanpro.gaia.workflow.base.event;

import cn.boommanpro.gaia.workflow.base.model.Chain;

/**
 * 链事件基类
 * 提供通用的事件属性和方法
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
public abstract class BaseChainEvent implements ChainEvent {

    protected final Chain chain;
    protected final long timestamp;

    public BaseChainEvent(Chain chain) {
        this.chain = chain;
        this.timestamp = System.currentTimeMillis();
    }

    public Chain getChain() {
        return chain;
    }

    public long getTimestamp() {
        return timestamp;
    }
}

