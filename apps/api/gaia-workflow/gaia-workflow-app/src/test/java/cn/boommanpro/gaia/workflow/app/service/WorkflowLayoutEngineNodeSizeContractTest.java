package cn.boommanpro.gaia.workflow.app.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.fail;

/**
 * 节点尺寸单一来源契约（P-01）：
 * 画布节点真实尺寸的唯一事实源是 apps/console/src/nodes/&lt;type&gt;/index.ts 注册表的 size 字段
 * （NC-01：画布生命周期归前端）；后端 {@link WorkflowLayoutEngine} 只持有一份布局用只读镜像。
 * 本测试直接解析 TS 源码断言镜像一致——前端改尺寸而不同步后端表（或反向）都会在此失败，
 * 防止回到「步长小于节点尺寸、打开就一坨」的旧坑。
 */
@DisplayName("布局尺寸表 ⇆ 前端节点注册表 契约")
class WorkflowLayoutEngineNodeSizeContractTest {

    /** 匹配 index.ts(x) 中 size: { width: 360, height: 390 } 的注册表形状 */
    private static final Pattern SIZE_PATTERN =
        Pattern.compile("size:\\s*\\{\\s*width:\\s*(\\d+),\\s*height:\\s*(\\d+)");

    @Test
    @DisplayName("后端尺寸镜像必须与前端注册表逐类型一致")
    void backendMirrorMatchesFrontendRegistries() throws IOException {
        Path nodesDir = locateConsoleNodesDir();
        Map<String, int[]> frontendSizes = new HashMap<>();
        try (Stream<Path> dirs = Files.list(nodesDir)) {
            dirs.filter(Files::isDirectory).forEach(dir -> {
                Path registry = Stream.of("index.ts", "index.tsx")
                    .map(dir::resolve).filter(Files::exists).findFirst().orElse(null);
                if (registry == null) {
                    return;
                }
                Matcher matcher = SIZE_PATTERN.matcher(read(registry));
                if (!matcher.find()) {
                    return;
                }
                frontendSizes.put(dir.getFileName().toString(),
                    new int[]{Integer.parseInt(matcher.group(1)), Integer.parseInt(matcher.group(2))});
            });
        }
        assertThat(frontendSizes).as("前端注册表必须解析到尺寸（目录定位或格式变化时明失败）").isNotEmpty();

        Map<String, int[]> backendMirror = WorkflowLayoutEngine.NODE_SIZES;

        frontendSizes.forEach((type, size) -> {
            int[] mirror = backendMirror.get(type);
            assertThat(mirror)
                .as("类型 %s 在前端注册了尺寸 %dx%d，但后端布局镜像缺失——请在 WorkflowLayoutEngine.NODE_SIZES 同步登记",
                    type, size[0], size[1])
                .isNotNull();
            assertThat(mirror)
                .as("类型 %s 尺寸漂移：前端 %dx%d vs 后端镜像 %dx%d", type, size[0], size[1], mirror[0], mirror[1])
                .containsExactly(size[0], size[1]);
        });

        backendMirror.keySet().forEach(type ->
            assertThat(frontendSizes)
                .as("后端镜像里的类型 %s 在前端注册表已不存在（可能已删除节点）——请同步清理 NODE_SIZES", type)
                .containsKey(type));
    }

    /** 从工作目录向上定位 apps/console/src/nodes（兼容 maven 模块目录与 IDE 自定义工作目录） */
    private static Path locateConsoleNodesDir() {
        Path dir = Paths.get(System.getProperty("user.dir")).toAbsolutePath();
        for (int i = 0; i < 8 && dir != null; i++, dir = dir.getParent()) {
            Path candidate = dir.resolve(Paths.get("apps", "console", "src", "nodes"));
            if (Files.isDirectory(candidate)) {
                return candidate;
            }
        }
        fail("定位不到 apps/console/src/nodes——请在仓库内运行测试（P-01 契约测试必须在源码树内验证）");
        return null;
    }

    private static String read(Path path) {
        try {
            return Files.readString(path, StandardCharsets.UTF_8);
        } catch (IOException e) {
            return fail("读取 " + path + " 失败", e);
        }
    }
}
