package cn.boommanpro.gaia.workflow.app.agent.tool;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 工具执行结果。与前端旧协议保持一致：结果永远是 JSON 字符串。
 */
@Data
@AllArgsConstructor
public class ToolResult {

    /** 是否执行成功 */
    private boolean success;

    /** 结果 JSON 字符串，会回灌给模型 */
    private String payload;

    /** 是否被权限策略拒绝 */
    private boolean rejected;

    /** 人类可读的描述，用于日志与调试面板 */
    private String message;

    public static ToolResult ok(String payload) {
        return new ToolResult(true, payload, false, null);
    }

    public static ToolResult ok(String payload, String message) {
        return new ToolResult(true, payload, false, message);
    }

    public static ToolResult fail(String payload, String message) {
        return new ToolResult(false, payload, false, message);
    }

    public static ToolResult rejected(String message) {
        return new ToolResult(false, "{\"error\":\"forbidden: " + message + "\"}", true, message);
    }

    /** 工具在当前执行面不可用 */
    public static ToolResult unavailable(String message) {
        return new ToolResult(false, "{\"error\":\"" + message + "\"}", false, message);
    }
}
