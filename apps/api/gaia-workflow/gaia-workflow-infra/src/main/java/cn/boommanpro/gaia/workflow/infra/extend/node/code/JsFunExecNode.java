package cn.boommanpro.gaia.workflow.infra.extend.node.code;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import lombok.extern.slf4j.Slf4j;

import javax.script.Bindings;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import java.util.HashMap;
import java.util.Map;

/**
 * 代码功能
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/06/11 14:46
 */
@Slf4j
public class JsFunExecNode extends CodeNode {

    private String code;

    public JsFunExecNode(String code) {
        this.code = code;
    }

    private static final String funcWrapper = "function jsFunc(){%s};\njsFunc();";
    @Override
    public Map<String, Object> execute( Chain chain) {
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
            code = String.format(funcWrapper, code);

            Map<String, Object> tempResult = new HashMap();
            bindings.put("_chain", chain);
            bindings.put("_result", tempResult);

            try {
                Map<String, Object> eval = (Map<String, Object>) engine.eval(code, bindings);
                return eval;
            } catch (ScriptException e) {
                throw new RuntimeException("GraalJS 执行失败", e);
            }
        }
    }

    @Override
    protected Map<String, Object> getParametersData(Chain chain) {
        return chain.getParametersData(this);
    }
}
