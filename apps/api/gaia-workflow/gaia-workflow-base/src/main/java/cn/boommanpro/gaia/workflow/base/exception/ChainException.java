package cn.boommanpro.gaia.workflow.base.exception;

/**
 * 代码功能
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17 14:52
 */
public class ChainException extends RuntimeException {
    public ChainException(Exception exception) {

    }

    public ChainException(String message) {
        super(message);
    }
}
