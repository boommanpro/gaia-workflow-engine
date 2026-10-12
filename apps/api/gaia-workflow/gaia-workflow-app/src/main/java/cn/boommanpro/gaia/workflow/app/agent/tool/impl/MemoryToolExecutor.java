package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.memory.AgentMemoryManager;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.springframework.stereotype.Component;

/**
 * 记忆工具组（owb remember/forget 对标，2026-10-11）：
 * remember / forget / list_memory 三动作合一个执行器（action 分发）。
 * 适合记的内容：用户偏好（输出风格/命名习惯）、平台事实（哪个工作流是生产用的）、
 * 项目约定。不适合：密钥（写侧拦截）、一次性上下文。
 */
@Component
public class MemoryToolExecutor implements ToolExecutor {

    private final AgentMemoryManager memoryManager;

    public MemoryToolExecutor(AgentMemoryManager memoryManager) {
        this.memoryManager = memoryManager;
    }

    @Override
    public String name() {
        return "memory";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "长期记忆管理：remember 记住跨会话有效的偏好/事实，forget 按关键词删除，list 查看";
    }

    @Override
    public boolean concurrencySafe() {
        return true;
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String action = args.getStr("action");
        if (action == null || action.isEmpty()) {
            return ToolResult.fail("{\"error\":\"action is required (remember|forget|list)\"}",
                "缺少 action", cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode.INVALID_ARGS);
        }
        switch (action) {
            case "remember": {
                String content = args.getStr("content");
                String message = memoryManager.remember(content);
                return ToolResult.ok(new JSONObject().set("result", message).toString(), message);
            }
            case "forget": {
                String keyword = args.getStr("keyword");
                int removed = memoryManager.forget(keyword);
                String message = removed > 0 ? "已删除 " + removed + " 条记忆" : "没有匹配的记忆";
                return ToolResult.ok(new JSONObject().set("removed", removed).toString(), message);
            }
            case "list": {
                JSONArray items = new JSONArray();
                memoryManager.entries().forEach(m ->
                    items.add(new JSONObject()
                        .set("id", m.getId())
                        .set("content", m.getContent())
                        .set("source", m.getSource())));
                return ToolResult.ok(new JSONObject().set("items", items).toString(),
                    "共 " + items.size() + " 条记忆");
            }
            default:
                return ToolResult.fail("{\"error\":\"unknown action: " + action + "\"}",
                    "未知 action", cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode.INVALID_ARGS);
        }
    }
}
