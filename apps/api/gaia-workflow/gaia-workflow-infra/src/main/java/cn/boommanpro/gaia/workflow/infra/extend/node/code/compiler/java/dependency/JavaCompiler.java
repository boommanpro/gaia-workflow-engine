package cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.java.dependency;


import cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.java.utils.SpringBootJarExtract;
import cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.pojo.JavaCompilerResult;
import com.google.common.collect.Lists;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import javax.tools.*;
import java.io.*;
import java.net.URI;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
public class JavaCompiler extends AbstractCompiler {


    private static final javax.tools.JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();

    /**
     * 具体参数信息取决于当前jdk
     */
    private static final List<String> OPTIONS = Lists.newArrayList("-g", "-source", "17", "-target", "17", "-encoding", "UTF-8");


    @Override
    protected JavaCompilerResult doCompile(String name, String script, ClassLoader classLoader) {
        // 创建新的DiagnosticCollector和MemoryJavaFileManager实例避免状态污染
        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        MemoryJavaFileManager javaFileManager = new MemoryJavaFileManager(compiler.getStandardFileManager(diagnostics, null, null));

        // 将 extractedPath 添加到类路径
        SpringBootJarExtract.initJarCompilerEnvironment();
        //① 将source code -> MemoryJavaFileObject
        MemoryJavaFileObject javaSource = new MemoryJavaFileObject(name, script);

        try {
            // ③ 填充项目依赖到MemoryJavaFileManager
            fillThirdDependencyToFileManager(javaFileManager);
            // ④借助jdk本身的compiler 直接进行编译
            compiler.getTask(null, javaFileManager, diagnostics, OPTIONS, null, Arrays.asList(javaSource)).call();
            //编译错误处理
            validJavaCompilerSourceError(name, diagnostics, javaSource);
            return loadAndReturnCompilerResult(script,javaFileManager, name, classLoader);
        } catch (Exception e) {
            throw new ScriptIllegalException("script compile ERROR!error message:" + e.getMessage(), e);
        } finally {
            resourceClose(name, javaSource, javaFileManager);
        }
    }

    private static void resourceClose(String name, MemoryJavaFileObject javaSource, MemoryJavaFileManager javaFileManager) {
        try {
            javaSource.delete();
            javaFileManager.close();
        } catch (Exception e1) {
            log.error("close source error!,className={}", name, e1);
        }
    }

    private static void validJavaCompilerSourceError(String name, DiagnosticCollector<JavaFileObject> diagnostics, MemoryJavaFileObject javaSource) {
        for (Diagnostic<? extends JavaFileObject> diagnostic : diagnostics.getDiagnostics()) {
            if (diagnostic.getKind().compareTo(Diagnostic.Kind.ERROR) <= 0) {
                String errorCode =
                        javaSource.getErrorCode(diagnostic.getLineNumber(), diagnostic.getPosition()) + diagnostic.getMessage(null);
                log.error(errorCode + ",className=" + name);
                throw new RuntimeException(errorCode + ",className=" + name);
            }
        }
    }

    private static void fillThirdDependencyToFileManager(MemoryJavaFileManager javaFileManager) {
        SpringBootJarExtract.getExtractedFile().ifPresent(files -> {
            try {
                javaFileManager.setLocation(StandardLocation.CLASS_PATH, files);
            } catch (IOException e) {
                throw new ScriptIllegalException("classLoader path url fail！error message：" + e.getMessage(), e);
            }
        });
    }

    private JavaCompilerResult loadAndReturnCompilerResult(String script, MemoryJavaFileManager javaFileManager, String name, ClassLoader classLoader) {
        // 获取编译后的所有类字节码
        Map<String, byte[]> classBytesMap = javaFileManager.getAllJavaClass();

        JavaCompilerResult result = new JavaCompilerResult();
        List<Class<?>> allClass = classBytesMap.entrySet().stream()
                .map(entry -> {
                    Class<?> clazz = ((MemoryClassLoader) classLoader).loadClass(entry.getKey(), entry.getValue());
                    if (entry.getKey().equals(name)) {
                        log.debug(String.format("%s script compile success! class length=%d", name, entry.getValue().length));
                    }
                    return clazz;
                }).collect(Collectors.toList());

        result.setClassList(allClass);
        result.setMainClass(((List<Class<?>>) allClass).stream()
                .filter(clazz -> clazz.getName().equals(name)).findFirst().get());
        // 保存字节码映射，供后续使用
        result.setClassBytesMap(classBytesMap);
        result.setClazzCode(script);
        return result;
    }

    public static byte[] getBytes(String className) {
        // 注意：这个方法现在可能无法正常工作，因为javaFileManager不再是静态的
        // 如果需要获取字节码，应该在编译成功后立即获取
        throw new UnsupportedOperationException("getBytes is no longer supported due to state isolation improvements");
    }


    public static class MemoryJavaFileManager extends ForwardingJavaFileManager<StandardJavaFileManager> {

        private final Map<URI, MemoryJavaFileObject> fileObjectMap = new LinkedHashMap<>();
        protected final StandardJavaFileManager fileManager;

        protected MemoryJavaFileManager(StandardJavaFileManager fileManager) {
            super(fileManager);
            this.fileManager = fileManager;
        }

        /**
         * 获得所有的类字map
         */
        public Map<String, byte[]> getAllJavaClass() {
            return Optional.ofNullable(fileObjectMap).orElse(Collections.emptyMap()).entrySet().stream()
                    .collect(Collectors.toMap(
                            entry -> uri2ClassName(entry.getKey()),
                            entry -> entry.getValue().getBytes(),
                            (u1, u2) -> u1,
                            LinkedHashMap::new)
                    );
        }

        private String uri2ClassName(URI uri) {
            return uri.getPath().replaceFirst("/", "").replace('/', '.').replace(JavaFileObject.Kind.CLASS.extension, "");
        }

        @Override
        public JavaFileObject getJavaFileForOutput(Location location, String className, JavaFileObject.Kind kind,
                                                   FileObject sibling) throws IOException {
            MemoryJavaFileObject javaFileObject = new MemoryJavaFileObject(className, kind);
            fileObjectMap.put(javaFileObject.toUri(), javaFileObject);
            return javaFileObject;
        }

        @Override
        public void close() throws IOException {
            fileObjectMap.values().forEach(MemoryJavaFileObject::delete);
            super.close();
        }

        void setLocation(Location location, Iterable<? extends File> path) throws IOException {
            fileManager.setLocation(location, path);
        }

    }

    @Slf4j
    public static class MemoryJavaFileObject extends SimpleJavaFileObject {

        private String code;
        @Getter
        private String className;
        private final ByteArrayOutputStream stream = new ByteArrayOutputStream();

        public MemoryJavaFileObject(String name, String script) {
            super(URI.create(String.format("string:///%s%s", name.replace('.', '/'), Kind.SOURCE.extension)), Kind.SOURCE);
            this.code = script;
            this.className = name;
        }

        public MemoryJavaFileObject(String name, Kind kind) {
            super(URI.create(String.format("string:///%s%s", name.replace('.', '/'), kind.extension)), kind);
        }

        @Override
        public CharSequence getCharContent(boolean ignoreEncodingErrors) {
            return code;
        }

        @Override
        public OutputStream openOutputStream() {
            return stream;
        }

        public byte[] getBytes() {
            return stream.toByteArray();
        }

        /**
         * 编译出错时，获得出错的代码位置
         */
        public String getErrorCode(long line, long position) {
            LineNumberReader reader = new LineNumberReader(new StringReader(code));
            int num = 0;
            String s = null;
            try {
                while ((s = reader.readLine()) != null) {
                    num++;
                    if (num == line) {
                        break;
                    }
                }
            } catch (IOException e) {
                log.warn(e.getMessage(), e);
            } finally {
                try {
                    reader.close();
                } catch (IOException e) {
                    log.warn(e.getMessage(), e);
                }
            }
            return s;
        }

        @Override
        public boolean delete() {
            code = null;
            className = null;
            try {
                stream.close();
            } catch (IOException e) {
                log.warn("IOException!", e);
            }
            return true;
        }

    }

}
