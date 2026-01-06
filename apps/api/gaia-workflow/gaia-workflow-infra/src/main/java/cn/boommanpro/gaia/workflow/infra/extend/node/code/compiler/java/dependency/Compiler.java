package cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.java.dependency;


import cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.pojo.JavaCompilerResult;

public interface Compiler {

    JavaCompilerResult compile(String script, ClassLoader classLoader);

}
