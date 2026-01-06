package cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.java.dependency;


import cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.pojo.JavaCompilerResult;

import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;


public abstract class AbstractCompiler implements Compiler {


    /**
     * 包名正则表达式
     **/
    private static final Pattern PACKAGE_PATTERN = Pattern.compile("package\\s+([$_a-zA-Z][$_a-zA-Z0-9\\.]*);");

    /**
     * 类名正则表达式
     **/
    private static final Pattern CLASS_PATTERN = Pattern.compile("class\\s+([$_a-zA-Z][$_a-zA-Z0-9]*)(\\s|\\{)+");

    /**
     * 类名随机数
     */
    private Random random = new Random();

    public JavaCompilerResult compile(String script, ClassLoader classLoader) {
        script = script.trim();
        Matcher matcher = PACKAGE_PATTERN.matcher(script);
        String pkg;
        if (matcher.find()) {
            pkg = matcher.group(1);
        } else {
            pkg = "";
        }
        matcher = CLASS_PATTERN.matcher(script);
        String cls;
        if (matcher.find()) {
            String match = matcher.group();
            String className = matcher.group(1);
            cls = className + System.currentTimeMillis() + random.nextInt(1000);
            match = match.replaceFirst(className, cls);
            script = matcher.replaceFirst(match).replace(String.format("%s.class", className), String.format("%s.class", cls));
        } else {
            throw new ScriptIllegalException("No such class name in " + script);
        }
        String fullClassName = pkg != null && !pkg.isEmpty() ? pkg + "." + cls : cls;
        return doCompile(fullClassName, script, classLoader);
    }

    protected abstract JavaCompilerResult doCompile(String name, String script, ClassLoader classLoader);

}
