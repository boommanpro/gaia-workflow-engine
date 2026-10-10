package cn.boommanpro.gaia.workflow.app.agent.tool;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

/**
 * 工具执行结果。与前端旧协议保持一致：payload 永远是 JSON 字符串。
 *
 * <p>v2 起带 {@link ToolErrorCode}：失败结果统一为
 * {@code {"error":{"code":"INVALID_ARGS","message":"...","violations":[...]}}}，
 * 模型依据 code 与 violations 自修参数，运行时依据 code 分类熔断与统计。</p>
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

    /** 结构化错误码（成功时为 null） */
    private ToolErrorCode errorCode;

    public static ToolResult ok(String payload) {
        return new ToolResult(true, payload, false, null, null);
    }

    public static ToolResult ok(String payload, String message) {
        return new ToolResult(true, payload, false, message, null);
    }

    public static ToolResult fail(String payload, String message) {
        return new ToolResult(false, payload, false, message, ToolErrorCode.EXEC_ERROR);
    }

    public static ToolResult fail(String payload, String message, ToolErrorCode errorCode) {
        return new ToolResult(false, payload, false, message, errorCode);
    }

    /** 参数违规：payload 带 path 级清单，模型下一轮按清单修参数 */
    public static ToolResult invalidArgs(List<ToolArgsValidator.Violation> violations, String hint) {
        JSONArray list = new JSONArray();
        for (ToolArgsValidator.Violation v : violations) {
            list.add(new JSONObject()
                .set("path", v.getPath())
                .set("issue", v.getIssue())
                .set("fix", v.getFix()));
        }
        JSONObject error = new JSONObject()
            .set("code", ToolErrorCode.INVALID_ARGS.name())
            .set("message", hint != null ? hint : "参数不符合工具 schema，请按 violations 修正后重新调用")
            .set("violations", list);
        return new ToolResult(false, new JSONObject().set("error", error).toString(), false,
            "参数校验未通过（" + violations.size() + " 处）", ToolErrorCode.INVALID_ARGS);
    }

    public static ToolResult notFound(String what) {
        return fail(new JSONObject().set("error", new JSONObject()
                .set("code", ToolErrorCode.NOT_FOUND.name())
                .set("message", what + " 不存在，请先用查询工具核对编码/ID 后重试")).toString(),
            what + " 不存在", ToolErrorCode.NOT_FOUND);
    }

    /** CAS 冲突：携带双方 revision 与补救指引 */
    public static ToolResult staleRevision(String workflowCode, long expected, long actual) {
        return fail(new JSONObject().set("error", new JSONObject()
            .set("code", ToolErrorCode.STALE_REVISION.name())
            .set("message", "工作流 " + workflowCode + " 已被并发修改（你基于 revision " + expected
                + "，当前已是 " + actual + "）。请重新 read_workflow 获取最新状态和 revision，"
                + "再把你的改动重新应用到新状态上"))
            .set("expectedRevision", expected)
            .set("actualRevision", actual).toString(),
            "工作流已被并发修改，需重读后重放", ToolErrorCode.STALE_REVISION);
    }

    public static ToolResult rejected(String message) {
        return new ToolResult(false,
            new JSONObject().set("error", new JSONObject()
                .set("code", ToolErrorCode.REJECTED_POLICY.name())
                .set("message", message)).toString(),
            true, message, ToolErrorCode.REJECTED_POLICY);
    }

    /** 拒绝并回灌自定义 payload（如给模型的补救指引） */
    public static ToolResult rejected(String payload, String message) {
        return new ToolResult(false, payload, true, message, ToolErrorCode.REJECTED_POLICY);
    }

    /** 工具在当前执行面不可用 */
    public static ToolResult unavailable(String message) {
        return new ToolResult(false,
            new JSONObject().set("error", new JSONObject()
                .set("code", ToolErrorCode.UNAVAILABLE_SURFACE.name())
                .set("message", message)).toString(),
            false, message, ToolErrorCode.UNAVAILABLE_SURFACE);
    }
}
