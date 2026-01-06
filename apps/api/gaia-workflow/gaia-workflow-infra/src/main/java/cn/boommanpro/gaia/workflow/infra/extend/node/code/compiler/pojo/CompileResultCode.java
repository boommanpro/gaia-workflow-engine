package cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.pojo;

public enum CompileResultCode {
    SUCCESS(0),
    COMPILE_EXCEPTION(-1),
    OTHER_EXCEPTION(-4),
    ;

    private final int code;

    CompileResultCode(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}
