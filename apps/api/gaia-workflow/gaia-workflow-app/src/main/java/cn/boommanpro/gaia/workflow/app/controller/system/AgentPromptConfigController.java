package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.app.service.AgentPromptComposer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Agent 人设/规范配置 + 技能库管理接口（2026-10-17 期4，管理后台「Agent 配置」页用）。
 */
@RestController
@RequestMapping("api/admin/agent-config")
public class AgentPromptConfigController {

    @Autowired
    private AgentPromptComposer promptComposer;

    /** 四个配置文件当前内容（DB 有值标注 overridden，前端可提供「恢复默认」） */
    @GetMapping("prompt")
    public Map<String, Object> promptConfigs() {
        return promptComposer.describeAll();
    }

    /** 保存配置（content 为空串=恢复 classpath 默认） */
    @PostMapping("prompt")
    public Map<String, Object> savePrompt(@RequestBody Map<String, Object> body) {
        String key = body.get("key") != null ? String.valueOf(body.get("key")) : null;
        String content = body.get("content") != null ? String.valueOf(body.get("content")) : "";
        Map<String, Object> result = new java.util.HashMap<>();
        if (!promptComposer.isValidKey(key)) {
            result.put("success", false);
            result.put("error", "未知的配置键: " + key);
            return result;
        }
        boolean saved = promptComposer.save(key, content, "admin");
        result.put("success", saved);
        return result;
    }

}
