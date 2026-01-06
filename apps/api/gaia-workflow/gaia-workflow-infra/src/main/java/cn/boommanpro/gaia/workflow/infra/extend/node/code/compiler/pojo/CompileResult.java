package cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.*;
import java.util.stream.Collectors;

@Data
@AllArgsConstructor
public class CompileResult {

    protected final Class<?> clazz;
    protected final String clazzCode;
    protected final List<Class<?>> classList;
    protected final CompileResultCode code;
    protected final String msg;

    // 保存编译生成的字节码，避免后续需要重新获取
    private Map<String, byte[]> classBytesMap = new HashMap<>();

    public static CompileResult success(Class<?> result, String clazzCode) {
        return new CompileResult(result, clazzCode, Arrays.asList(result), CompileResultCode.SUCCESS, "ok", new HashMap<>());
    }

    public static CompileResult success(Class<?> result, String clazzCode, List<Class<?>> classList) {
        return new CompileResult(result, clazzCode, classList, CompileResultCode.SUCCESS, "ok", new HashMap<>());
    }


    public static CompileResult compileException(Exception e) {
        return new CompileResult(null, null, null, CompileResultCode.COMPILE_EXCEPTION, e.getMessage(), new HashMap<>());
    }


    public static CompileResult otherException(Exception e) {
        return new CompileResult(null, null,null, CompileResultCode.OTHER_EXCEPTION, e != null ? e.getMessage() : null, new HashMap<>());
    }

    /**
     * 设置编译后的字节码，用于后续序列化
     *
     * @param classBytesMap 类名到字节码的映射
     */
    public void setClassBytesMap(Map<String, byte[]> classBytesMap) {
        this.classBytesMap = classBytesMap;
    }

    /**
     * only support java type
     *
     * @return
     * @throws Exception
     */
    public CompilerCache getCompilerCache() throws Exception {
        CompilerCache compilerCache = new CompilerCache();
        compilerCache.setMainClassName(clazz.getName());

        Map<String, String> encodeCacheMap = classList.stream().collect(Collectors.toMap(
                Class::getName,
                cls -> {
                    try {
                        // 优先从缓存中获取字节码
                        byte[] classBytes = classBytesMap.get(cls.getName());
                        if (classBytes == null) {
                            // 如果缓存中没有，则尝试通过ClassLoader获取
                            classBytes = getClassBytesFromClassLoader(cls);
                        }
                        return Base64.getEncoder().encodeToString(classBytes);
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to read class bytes for " + cls.getName(), e);
                    }
                }
        ));

        compilerCache.setEncodeClassMap(encodeCacheMap);
        return compilerCache;
    }

    /**
     * 从ClassLoader中获取类的字节码
     *
     * @param clazz 类对象
     * @return 字节码数组
     */
    private byte[] getClassBytesFromClassLoader(Class<?> clazz) {
        // 这是一个简化的实现，实际项目中可能需要更复杂的逻辑
        // 比如通过反射访问ClassLoader的内部结构
        throw new UnsupportedOperationException("Cannot retrieve class bytes after compilation. " +
                "Please use setClassBytesMap to provide class bytes during compilation success.");
    }
}
