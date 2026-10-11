package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 事件录制器契约：每会话一个 ndjson 文件、每行一条事件（ts/type/data），
 * 产出的行即前端回放 fixture 的 events 来源。
 */
@DisplayName("SessionEventFileRecorder：会话事件落 ndjson")
class SessionEventFileRecorderTest {

    @TempDir
    Path tempDir;

    @Test
    @DisplayName("两条事件落两行，字段齐全，路径敏感字符被收敛")
    void recordsNdjsonLinesPerSession() throws Exception {
        SessionEventFileRecorder recorder = new SessionEventFileRecorder(tempDir.toString());

        recorder.record("session/a#1", "token", new JSONObject().set("content", "你"));
        recorder.record("session/a#1", "done", new JSONObject());

        Path file = tempDir.resolve("session_a_1.ndjson");
        assertTrue(Files.exists(file));
        List<String> lines = Files.readAllLines(file);
        assertEquals(2, lines.size());
        assertTrue(lines.get(0).contains("\"type\":\"token\""));
        assertTrue(lines.get(0).contains("\"content\":\"你\""));
        assertTrue(lines.get(1).contains("\"type\":\"done\""));
    }
}
