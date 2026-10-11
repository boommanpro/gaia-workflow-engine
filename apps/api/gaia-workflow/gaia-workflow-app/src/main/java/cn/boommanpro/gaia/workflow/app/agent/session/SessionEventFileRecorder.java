package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 会话事件文件录制器：每个会话一个 ndjson 文件，每行一条事件。
 *
 * <p>配置 {@code agent.dev.record-events-dir} 指向输出目录后生效（未配置不装配）。
 * 产出的 ndjson 即前端回放 fixture 的 events 数组来源：
 * 录制后把行包进 {@code {"events":[...]}}（或直接逐行转 ReplayEvent）即可离线回放。</p>
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "agent.dev.record-events-dir")
public class SessionEventFileRecorder implements SessionEventRecorder {

    private final Path baseDir;
    private final Map<String, BufferedWriter> writers = new ConcurrentHashMap<>();

    public SessionEventFileRecorder(@Value("${agent.dev.record-events-dir}") String dir) {
        this.baseDir = Path.of(dir);
        try {
            Files.createDirectories(baseDir);
        } catch (IOException e) {
            log.warn("[event-recorder] cannot create dir {}: {}", dir, e.getMessage());
        }
        log.info("[event-recorder] recording session events to {}", baseDir.toAbsolutePath());
    }

    @Override
    public void record(String sessionKey, String type, cn.hutool.json.JSONObject data) {
        try {
            String line = JSONUtil.createObj()
                    .set("ts", System.currentTimeMillis())
                    .set("type", type)
                    .set("data", data == null ? JSONUtil.createObj() : data)
                    .toString() + "\n";
            BufferedWriter writer = writerFor(sessionKey);
            synchronized (writer) {
                writer.write(line);
                writer.flush();
            }
        } catch (Exception e) {
            log.debug("[event-recorder] record failed (ignored): {}", e.getMessage());
        }
    }

    private BufferedWriter writerFor(String sessionKey) throws IOException {
        return writers.computeIfAbsent(sanitize(sessionKey), key -> {
            try {
                return Files.newBufferedWriter(baseDir.resolve(key + ".ndjson"),
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            } catch (IOException e) {
                throw new IllegalStateException(e);
            }
        });
    }

    /** 会话 key 可能含路径敏感字符，收敛成安全文件名 */
    private static String sanitize(String sessionKey) {
        return sessionKey.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
