package cn.boommanpro.gaia.workflow.infra.extend.node.code;

import com.oracle.truffle.js.scriptengine.GraalJSScriptEngine;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.HostAccess;
import org.graalvm.polyglot.Value;

import javax.script.Bindings;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * GraalJS 引擎解析与执行上下文。
 *
 * <p><b>fat jar 类加载器修复（2026-10-24 会话 b6e34195 实证）</b>：
 * ScriptEngineManager 的服务发现、polyglot 的语言（truffle LanguageProvider）发现、
 * 以及 eval 期 truffle {@code org.graalvm.home.HomeFinder} 的静态初始化，全都依赖
 * 线程上下文类加载器。Spring Boot fat jar 里，工作流执行线程的上下文类加载器看不到
 * BOOT-INF/lib（js/truffle-api/graal-sdk 都在其中），依次表现为「未找到 GraalJS 引擎」、
 * {@code No language and polyglot implementation was found on the classpath}、
 * {@code No implementation of org.graalvm.home.HomeFinder could be found}。
 * 同一组依赖 classpath 模式下完全正常。</p>
 *
 * <p>修复方式：引擎构造与 eval 全程把上下文类加载器切到本类自己的类加载器
 * （能看到 BOOT-INF/lib 的那个），结束后恢复——对任意执行线程确定性生效，
 * classpath 模式不受影响。必须包住整个执行而不只是构造：HomeFinder 的失败
 * 发生在 eval 期。</p>
 */
final class GraalJsEngines {

    private static final String PARAMS_JSON_BINDING = "__gaia_params_json__";

    private GraalJsEngines() {
    }

    /** 在应用类加载器的上下文里执行 action（GraalJS 从构造到 eval 的服务发现都依赖线程 CCL） */
    static <T> T underAppLoader(Supplier<T> action) {
        ClassLoader appLoader = GraalJsEngines.class.getClassLoader();
        ClassLoader previous = Thread.currentThread().getContextClassLoader();
        if (appLoader != previous) {
            Thread.currentThread().setContextClassLoader(appLoader);
        }
        try {
            return action.get();
        } finally {
            if (appLoader != previous) {
                Thread.currentThread().setContextClassLoader(previous);
            }
        }
    }

    /** 解析 GraalJS 脚本引擎：服务发现优先，失败直连构造（host 访问全开，与原 bindings 语义一致） */
    static ScriptEngine resolve() {
        return underAppLoader(() -> {
            ScriptEngine discovered = new ScriptEngineManager().getEngineByName("graal.js");
            if (discovered != null) {
                return discovered;
            }
            return GraalJSScriptEngine.create(null,
                Context.newBuilder("js")
                    .allowHostAccess(HostAccess.ALL)
                    .allowHostClassLookup(className -> true));
        });
    }

    /**
     * 把入参注入 JS 上下文为<b>原生</b> JS 值：入参整体 JSON 序列化绑定为字符串，返回一段前导脚本
     * （在用户代码之前、同一引擎上下文里先 eval），用 JSON.parse 还原后按入参名声明顶层变量，
     * 并提供 input / inputs 两个对象别名（模型按其他平台习惯写 input.xxx，
     * 2026-10-24 实证 ReferenceError: input is not defined）。
     *
     * <p>为什么不用宿主对象或 Proxy：hutool JSONArray / List 在 JS 里是宿主对象，没有 map / filter
     * 等数组方法（2026-10-24 实证 TypeError: invokeMember (map) on cn.hutool.json.JSONArray failed）；
     * ProxyArray 同样不带 Array.prototype（Message not supported）。JSON.parse 得到的是原生数组 / 对象，
     * 模型按 JS 习惯写的一切都直接可用；返回值再经 {@link #toJavaValue} 转回 Java。
     * 前导脚本单独 eval，不改变用户代码的行号（错误里的行号仍准确）。</p>
     */
    static String prepareParameters(Bindings bindings, Map<String, Object> params) {
        Map<String, Object> safe = params != null ? params : Collections.emptyMap();
        bindings.put(PARAMS_JSON_BINDING, cn.hutool.json.JSONUtil.toJsonStr(safe));
        StringBuilder prologue = new StringBuilder("var __gaia_p = JSON.parse(" + PARAMS_JSON_BINDING + ");")
            .append(" var input = __gaia_p; var inputs = __gaia_p;");
        for (String name : safe.keySet()) {
            if (name != null && name.matches("[A-Za-z_$][\\w$]*")) {
                prologue.append(" var ").append(name).append(" = __gaia_p[\"").append(name).append("\"];");
            }
        }
        return prologue.toString();
    }

    /**
     * JS 返回值 → 普通 Java 值（递归）：JS 数组 → List，JS 对象 → Map，标量按类型取值。
     * 下游模板、JSON 序列化与变量面板都只认 Java 集合，不能让 polyglot 对象外泄。
     */
    static Object toJavaValue(Value value) {
        if (value == null || value.isNull()) {
            return null;
        }
        if (value.isHostObject()) {
            return value.asHostObject();
        }
        if (value.isBoolean()) {
            return value.asBoolean();
        }
        if (value.isNumber()) {
            if (value.fitsInInt()) {
                return value.asInt();
            }
            if (value.fitsInLong()) {
                return value.asLong();
            }
            return value.asDouble();
        }
        if (value.isString()) {
            return value.asString();
        }
        if (value.hasArrayElements()) {
            List<Object> list = new ArrayList<>();
            long size = value.getArraySize();
            for (long i = 0; i < size; i++) {
                list.add(toJavaValue(value.getArrayElement(i)));
            }
            return list;
        }
        if (value.hasMembers() && !value.canExecute()) {
            Map<String, Object> map = new LinkedHashMap<>();
            for (String key : value.getMemberKeys()) {
                map.put(key, toJavaValue(value.getMember(key)));
            }
            return map;
        }
        return value.as(Object.class);
    }

    /**
     * 把脚本异常压成模型可直接行动的一行：JS 异常类型 + 消息 + 行号，去掉 Java 包装类名。
     * 2026-10-24 实证：只回「GraalJS 执行失败」时模型对 ReferenceError 盲猜 8 轮直至熔断。
     */
    static String describe(ScriptException e) {
        String msg = e.getMessage() != null ? e.getMessage() : String.valueOf(e);
        int at = msg.indexOf("PolyglotException: ");
        if (at >= 0) {
            msg = msg.substring(at + "PolyglotException: ".length());
        }
        int newline = msg.indexOf('\n');
        if (newline > 0) {
            msg = msg.substring(0, newline);
        }
        if (e.getLineNumber() > 0) {
            msg += "（第 " + e.getLineNumber() + " 行）";
        }
        if (msg.contains("is not defined")) {
            msg += "。变量未定义：确认 inputs.properties 声明了它、inputsValues 里它引用的上游字段真实存在；"
                + "单节点试跑时 mockInputs 要按上游节点 id 分组（{\"<上游节点id>\":{\"<字段>\":值}}）或按本节点入参名直给";
        } else if (msg.contains("Illegal return") || (msg.contains("SyntaxError") && msg.contains("return"))) {
            msg += "。顶层不要写 return：代码的最后一个表达式就是返回值（写成对象字面量，如 ({a:1, b:2})）";
        }
        return msg;
    }
}
