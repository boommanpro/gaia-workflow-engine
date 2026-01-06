package cn.boommanpro.gaia.workflow.base.listener;

import cn.boommanpro.gaia.workflow.base.model.Chain;

/**
 * 链错误监听器接口
 * 用于监听链执行过程中的错误
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
public interface ChainErrorListener {
    /**
     * 当链执行发生错误时调用
     *
     * @param error 错误对象
     * @param chain 链对象
     */
    void onError(Throwable error, Chain chain);
}

