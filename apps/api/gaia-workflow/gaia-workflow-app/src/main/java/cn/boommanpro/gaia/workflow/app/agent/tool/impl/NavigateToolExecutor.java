package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.hutool.json.JSONObject;
import org.springframework.stereotype.Component;

/**
 * 导航工具的后端执行器。
 *
 * <p>页面跳转本质是浏览器行为，后端无法替窗口换路由。这里把它定义为
 * 「一个发给前端的 UI 指令」：执行器返回成功并把 {@code ui_action} 事件
 * 广播进会话事件流，任何在线的订阅窗口收到后自行 navigate。
 * 没有窗口在线时该事件无害丢弃，运行不受影响。</p>
 */
@Component
public class NavigateToolExecutor implements ToolExecutor {

    @Override
    public String name() {
        return "navigate";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.ANY;
    }

    @Override
    public String description() {
        return "页面导航（后端广播给前端执行）";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        // 广播给所有订阅窗口，由前端执行真实跳转
        if (context != null) {
            context.emit("ui_action", new JSONObject()
                .set("type", "navigate")
                .set("args", args != null ? args : new JSONObject()));
        }
        JSONObject payload = new JSONObject()
            .set("success", true)
            .set("target", args != null ? args.getStr("target") : null)
            .set("hint", "已下发导航指令给前端窗口");
        return ToolResult.ok(payload.toString(), "已下发页面导航指令");
    }
}
