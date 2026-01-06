package cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.groovy;

import cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.CompilerEngine;
import cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.pojo.CompileResult;
import groovy.lang.GroovyClassLoader;

public class GroovyCompilerEngine implements CompilerEngine {

    private static final GroovyClassLoader loader = new GroovyClassLoader();

    @Override
    public CompileResult loadClass(String script) {
        try {
            Class<?> result = loader.parseClass(script);
            //这里比较简单，没有对代码进行reformat
            return CompileResult.success(result, script);
        } catch (Exception e) {
            return CompileResult.otherException(e);
        }
    }
}
