package cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.java.utils;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.Optional;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;

@Slf4j
@Component
public class SpringBootJarExtract implements ApplicationContextAware {


    private static ApplicationContext applicationContext;

    public static final String extractedPath = "extracted";


    private static volatile boolean isExtracted = false;


    public static synchronized void initJarCompilerEnvironment() {
        if (applicationContext == null || isExtracted) {
            return;
        }
        log.info("initJarCompilerEnvironment start");
        // 删除 extractedPath 路径下的所有文件
        deleteDirectoryContents();
        String applicationName = applicationContext.getEnvironment().getProperty("spring.application.name");
        String classPath = System.getProperty("java.class.path");
        if (classPath.contains(".jar")) {
            // 获取JAR文件路径
            String jarPath = classPath.split(File.pathSeparator)[0];
            File jarFile = new File(jarPath);
            if (jarFile.exists() && jarFile.isFile() && jarFile.getName().contains(applicationName)) {
                try {
                    extractJar(jarFile, extractedPath);
                } catch (IOException e) {
                    log.error("extractJar fail, error:", e);
                }
            }
        } else {
            System.out.println("当前不是通过JAR包启动");
        }

    }

    private static Optional<List<File>> cachedFiles = Optional.empty(); // 缓存变量

    public static Optional<List<File>> getExtractedFile() {
        if (isExtracted) {
            if (!cachedFiles.isPresent()) {
                List<File> files = Optional.of(new File(extractedPath + "/BOOT-INF/lib/").getAbsolutePath()).map(directoryPath -> {
                    List<File> jarFiles = new ArrayList<>();
                    try {
                        Path dirPath = Paths.get(directoryPath);
                        Files.walk(dirPath)
                                .filter(path -> path.toFile().isFile() && path.toString().endsWith(".jar"))
                                .forEach(path -> jarFiles.add(path.toFile()));
                    } catch (Exception e) {
                        log.error("Failed to list .jar files in directory: {}", directoryPath, e);
                    }

                    return jarFiles;
                }).orElse(new ArrayList<>());
                cachedFiles = Optional.of(files);
            }
            return cachedFiles;
        }
        return Optional.empty();
    }

    private static void deleteDirectoryContents() {
        new File(SpringBootJarExtract.extractedPath).deleteOnExit();
    }

    private static void extractJar(File jarFile, String destDir) throws IOException {
        isExtracted = true;
        JarFile jar = new JarFile(jarFile);
        Enumeration<JarEntry> entries = jar.entries();
        while (entries.hasMoreElements()) {
            JarEntry entry = entries.nextElement();
            File file = new File(destDir, entry.getName());
            if (entry.isDirectory()) {
                file.mkdirs();
            } else {
                file.getParentFile().mkdirs();
                InputStream in = jar.getInputStream(entry);
                FileOutputStream out = new FileOutputStream(file);
                byte[] buffer = new byte[8192];
                int read;
                while ((read = in.read(buffer)) > 0) {
                    out.write(buffer, 0, read);
                }
                in.close();
                out.close();
            }
        }
        jar.close();
    }

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        SpringBootJarExtract.applicationContext = applicationContext;
    }
}
