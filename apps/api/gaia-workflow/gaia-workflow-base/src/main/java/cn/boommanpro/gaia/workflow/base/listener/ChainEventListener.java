package cn.boommanpro.gaia.workflow.base.listener;

import cn.boommanpro.gaia.workflow.base.event.ChainEvent;

/**
 * 链事件监听器接口
 * 用于监听链相关的所有事件
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
public interface ChainEventListener<T extends ChainEvent> {
    /**
     * 处理链事件
     *
     * @param event 事件对象
     */
    void onEvent(T event);
}

