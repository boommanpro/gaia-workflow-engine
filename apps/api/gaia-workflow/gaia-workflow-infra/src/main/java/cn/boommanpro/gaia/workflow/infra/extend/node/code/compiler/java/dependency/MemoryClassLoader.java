package cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.java.dependency;


import java.net.URL;
import java.net.URLClassLoader;
import java.util.HashMap;
import java.util.Map;


public class MemoryClassLoader extends URLClassLoader {

    private final Map<String, byte[]> classCache = new HashMap<>();

    public MemoryClassLoader() {
        super(new URL[0], Thread.currentThread().getContextClassLoader());
    }


    public Class<?> loadClass(String fullName, byte[] classData) {
        return this.defineClass(fullName, classData, 0, classData.length);
    }

    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {

        // 2. 缓存中没有，委托给父类加载器（双亲委派）
        try {
            // 1. 先尝试从缓存中加载
            byte[] classBytes = classCache.get(name);
            if (classBytes != null) {
                return defineClass(name, classBytes, 0, classBytes.length);
            }
            return super.findClass(name);
        } catch (ClassNotFoundException e) {
            // 父类加载器也找不到，抛出异常
            throw new ClassNotFoundException("Class " + name + " not found in memory or parent classloader", e);
        }
    }

    public void addClass(String name, byte[] classBytes) {
        classCache.put(name, classBytes);
    }
}
