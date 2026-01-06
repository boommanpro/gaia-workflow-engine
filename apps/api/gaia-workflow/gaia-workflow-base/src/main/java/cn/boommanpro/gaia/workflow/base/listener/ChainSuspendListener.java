package cn.boommanpro.gaia.workflow.base.listener;

import cn.boommanpro.gaia.workflow.base.model.Chain;

/**
 * 链暂停监听器接口
 * 用于监听链的暂停事件
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
public interface ChainSuspendListener {
    /**
     * 当链暂停时调用
     *
     * @param chain 链对象
     */
    void onSuspend(Chain chain);
}

