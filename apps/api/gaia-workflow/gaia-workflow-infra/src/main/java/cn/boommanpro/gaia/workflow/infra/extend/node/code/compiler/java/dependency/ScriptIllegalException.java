package cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.java.dependency;


public class ScriptIllegalException extends RuntimeException {

    public ScriptIllegalException(Throwable cause) {
        super(cause);
    }

    public ScriptIllegalException(String message) {
        super(message);
    }

    public ScriptIllegalException(String message, Throwable cause) {
        super(message, cause);
    }
}
