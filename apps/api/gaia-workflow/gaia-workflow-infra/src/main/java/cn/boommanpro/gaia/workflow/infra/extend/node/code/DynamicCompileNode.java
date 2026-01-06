package cn.boommanpro.gaia.workflow.infra.extend.node.code;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.CompilerEngineEnum;
import cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.pojo.CompileResult;
import lombok.extern.slf4j.Slf4j;

import javax.script.Bindings;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;

/**
 * 动态编译执行节点，支持多种语言（Java、JS、Groovy等）
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 */
@Slf4j
public class DynamicCompileNode extends CodeNode {

    private String code;
    private String language;

    public DynamicCompileNode(String code, String language) {
        this.code = code;
        this.language = language;
    }

    @Override
    public Map<String, Object> execute(Chain chain) {
        CompilerEngineEnum engineEnum = CompilerEngineEnum.valueOf(language.toUpperCase());
        switch (engineEnum) {
            case JAVA:
                return executeJava(chain);
            case GROOVY:
                return executeGroovy(chain);
            default:
                throw new IllegalArgumentException("Unsupported language: " + language);
        }
    }

    /**
     * 执行Java代码
     */
    private Map<String, Object> executeJava(Chain chain) {
        try {
            CompileResult compileResult = CompilerEngineEnum.JAVA.loadClass(code);
            if (compileResult.getCode().getCode() != 0) {
                throw new RuntimeException("Java compilation failed: " + compileResult.getMsg());
            }

            Class<?> clazz = compileResult.getClazz();
            Object instance = clazz.newInstance();

            // 检查是否实现了CodeExecute接口
            if (instance instanceof CodeExecute) {
                CodeExecute codeExecute = (CodeExecute) instance;
                Map<String, Object> parameterValues = chain.getParametersData(this);
                return codeExecute.execute(parameterValues != null ? parameterValues : new HashMap<>());
            }

            // 尝试调用execute方法
            Method executeMethod = clazz.getMethod("execute", Map.class);
            Map<String, Object> parameterValues = chain.getParametersData(this);
            return (Map<String, Object>) executeMethod.invoke(instance, parameterValues != null ? parameterValues : new HashMap<>());
        } catch (Exception e) {
            throw new RuntimeException("Java execution failed", e);
        }
    }

    /**
     * 执行Groovy代码
     */
    private Map<String, Object> executeGroovy(Chain chain) {
        try {
            CompileResult compileResult = CompilerEngineEnum.GROOVY.loadClass(code);
            if (compileResult.getCode().getCode() != 0) {
                throw new RuntimeException("Groovy compilation failed: " + compileResult.getMsg());
            }

            Class<?> clazz = compileResult.getClazz();
            Object instance = clazz.newInstance();

            // 检查是否实现了CodeExecute接口
            if (instance instanceof CodeExecute) {
                CodeExecute codeExecute = (CodeExecute) instance;
                Map<String, Object> parameterValues = chain.getParametersData(this);
                return codeExecute.execute(parameterValues != null ? parameterValues : new HashMap<>());
            }

            // 尝试调用execute方法
            Method executeMethod = clazz.getMethod("execute", Map.class);
            Map<String, Object> parameterValues = chain.getParametersData(this);
            return (Map<String, Object>) executeMethod.invoke(instance, parameterValues != null ? parameterValues : new HashMap<>());
        } catch (Exception e) {
            throw new RuntimeException("Groovy execution failed", e);
        }
    }

    /**
     * 执行JavaScript代码
     */
    private Map<String, Object> executeJavaScript(Chain chain) {
        ScriptEngine engine = (new ScriptEngineManager()).getEngineByName("graal.js");
        if (engine == null) {
            throw new RuntimeException("未找到 GraalJS 引擎，请确认依赖配置");
        } else {
            Bindings bindings = engine.createBindings();
            bindings.put("polyglot.js.allowHostAccess", true);
            bindings.put("polyglot.js.allowHostClassLookup", true);
            Map<String, Object> parameterValues = chain.getParametersData(this);
            if (parameterValues != null) {
                bindings.putAll(parameterValues);
            }

            String funcWrapper = "function jsFunc(){%s};\njsFunc();";
            String wrappedCode = String.format(funcWrapper, code);

            Map<String, Object> tempResult = new HashMap<>();
            bindings.put("_chain", chain);
            bindings.put("_result", tempResult);

            try {
                Map<String, Object> eval = (Map<String, Object>) engine.eval(wrappedCode, bindings);
                return eval;
            } catch (ScriptException e) {
                throw new RuntimeException("JavaScript execution failed", e);
            }
        }
    }
}
