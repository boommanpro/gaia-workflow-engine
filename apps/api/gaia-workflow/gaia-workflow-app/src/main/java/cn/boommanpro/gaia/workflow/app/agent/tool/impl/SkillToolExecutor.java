package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolGroup;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.AgentSkillCatalog;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.springframework.stereotype.Component;

/**
 * skill —— 按名称拉取技能全文（dsh/owb 同款横切工具，2026-10-17 反馈2）。
 *
 * <p>技能是「AI 可按需拉取的知识包」：系统提示词只留目录（名称+一句话），
 * 正文通过本工具懒加载——开局不撑上下文，用到才取。
 * 核心技能 {@code gaia-workflow-assistant} 是工作流搭建的完整操作手册，开工第一步加载。</p>
 */
@Component
public class SkillToolExecutor implements ToolExecutor {

    private static final String SKILL_MD = "SKILL.md";

    private final AgentSkillCatalog skillCatalog;

    public SkillToolExecutor(AgentSkillCatalog skillCatalog) {
        this.skillCatalog = skillCatalog;
    }

    @Override
    public String name() {
        return "skill";
    }

    @Override
    public ToolGroup group() {
        return ToolGroup.COMMON;
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public boolean concurrencySafe() {
        return true;
    }

    @Override
    public String description() {
        return "按名称加载技能全文（工作流搭建知识包：gaia-workflow-assistant）";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String name = args.getStr("name");
        if (name != null) name = name.trim();
        if (name == null || name.isEmpty()) {
            return ToolResult.fail(new JSONObject().set("error", "缺少 name").toString(), "缺少 name");
        }
        context.emit("skill_loaded", new JSONObject().set("name", name));

        // 路径模式：skill("gaia-workflow-assistant/references/tool-chain.md") → 返回引用文件
        int slash = name.indexOf('/');
        if (slash > 0) {
            String skillName = name.substring(0, slash);
            String filePath = name.substring(slash + 1);
            var file = skillCatalog.getFile(skillName, filePath);
            if (file == null) {
                // 列出可用文件帮模型纠错
                var files = skillCatalog.getFiles(skillName);
                String available = files.stream().map(f -> f.getFilePath()).collect(java.util.stream.Collectors.joining(", "));
                return ToolResult.notFound("文件 " + filePath + "（技能 " + skillName + " 可用文件: " + available + "）");
            }
            JSONObject payload = new JSONObject()
                .set("skill", skillName)
                .set("file", filePath)
                .set("content", file.getContent());
            return ToolResult.ok(payload.toString(), "已加载 " + name + "（" + file.getContent().length() + " 字符）");
        }

        // 技能模式：返回 SKILL.md 全文 + 可用引用文件清单
        var meta = skillCatalog.getMeta(name);
        if (meta == null) {
            return ToolResult.notFound("技能 " + name + "（可用技能见系统提示词技能目录）");
        }
        var mainFile = skillCatalog.getMainFile(name);
        if (mainFile == null) {
            return ToolResult.notFound("技能 " + name + " 缺少 SKILL.md");
        }
        JSONObject payload = new JSONObject()
            .set("name", name)
            .set("description", meta.getDescription())
            .set("content", mainFile.getContent());
        // 附带引用文件清单（模型可按需继续拉取）
        var files = skillCatalog.getFiles(name);
        JSONArray refList = new JSONArray();
        for (var f : files) {
            if (!SkillToolExecutor.SKILL_MD.equals(f.getFilePath())) {
                refList.add(f.getFilePath());
            }
        }
        if (!refList.isEmpty()) {
            payload.set("referenceFiles", refList);
            payload.set("hint", "引用更多内容：skill(\"" + name + "/<文件路径>\")");
        }
        return ToolResult.ok(payload.toString(), "已加载技能 " + name + "（" + mainFile.getContent().length() + " 字符"
            + (refList.isEmpty() ? "" : "，" + refList.size() + " 个引用文件可按需加载") + "）");
    }
}