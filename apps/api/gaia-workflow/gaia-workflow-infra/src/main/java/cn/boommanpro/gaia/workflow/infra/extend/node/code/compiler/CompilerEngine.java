package cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler;


import cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.pojo.CompileResult;

public interface CompilerEngine {
    CompileResult loadClass(String script);
}
