package cn.boommanpro.gaia.workflow.base.model;

/**
 * 代码功能
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17 09:51
 */
public interface EdgeCondition {
    boolean check(Chain chain,ChainEdge edge );
}
