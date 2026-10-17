package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.app.service.AgentPromptComposer;
import cn.boommanpro.gaia.workflow.app.service.AgentSkillCatalog;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSkill;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSkillFile;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSkillHistory;
import cn.hutool.json.JSONUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 技能库管理 REST API（多文件版，2026-10-17）。
 *
 * <p>技能 = 目录：SKILL.md 为入口 + references/ 引用文件。
 * 所有操作通过 {@link AgentSkillCatalog} 完成。</p>
 */
@RestController
@RequestMapping("api/admin/agent-config/skills")
public class AgentSkillController {

    @Autowired
    private AgentSkillCatalog skillCatalog;

    /** 技能列表（含文件数、启用/挂载状态） */
    @GetMapping
    public List<Map<String, Object>> list() {
        return skillCatalog.listAll().stream().map(this::toSummary).collect(Collectors.toList());
    }

    /** 单技能详情（元数据 + 全部文件内容） */
    @GetMapping("/{name}")
    public Map<String, Object> detail(@PathVariable String name) {
        AgentSkill meta = skillCatalog.getMeta(name);
        if (meta == null) {
            meta = skillCatalog.listAll().stream()
                .filter(s -> name.equals(s.getName())).findFirst().orElse(null);
        }
        if (meta == null) {
            Map<String, Object> result = new HashMap<>();
            result.put("error", "技能不存在: " + name);
            return result;
        }
        List<AgentSkillFile> files = skillCatalog.getFiles(name);
        Map<String, Object> result = toSummary(meta);
        result.put("files", files.stream().map(f -> Map.of(
            "path", f.getFilePath(),
            "content", f.getContent() != null ? f.getContent() : ""
        )).collect(Collectors.toList()));
        return result;
    }

    /** 保存技能（元数据 + 文件集合） */
    @PostMapping("save")
    public Map<String, Object> save(@RequestBody Map<String, Object> body) {
        String name = str(body.get("name"));
        if (name == null || name.isEmpty()) {
            return Map.of("success", false, "error", "name 必填");
        }
        boolean enabled = body.get("enabled") == null || Boolean.parseBoolean(String.valueOf(body.get("enabled")));
        skillCatalog.saveMeta(name,
            str(body.get("description")),
            str(body.get("kind")),
            enabled);

        // 文件集合保存
        if (body.get("files") instanceof List) {
            List<?> files = (List<?>) body.get("files");
            Map<String, String> fileMap = new java.util.LinkedHashMap<>();
            for (Object f : files) {
                if (f instanceof Map) {
                    Map<?, ?> fm = (Map<?, ?>) f;
                    String path = fm.get("path") != null ? String.valueOf(fm.get("path")) : null;
                    String content = fm.get("content") != null ? String.valueOf(fm.get("content")) : "";
                    if (path != null && !path.isEmpty()) {
                        fileMap.put(path, content);
                    }
                }
            }
            if (!fileMap.isEmpty()) {
                skillCatalog.saveFiles(name, fileMap, "admin");
            }
        } else if (body.get("content") != null) {
            // 单文件模式（兼容旧接口）：写到 SKILL.md
            skillCatalog.saveFile(name, "SKILL.md", String.valueOf(body.get("content")), "admin");
        }

        return Map.of("success", true, "name", name);
    }

    /** 启用/停用 */
    @PostMapping("{name}/toggle")
    public Map<String, Object> toggle(@PathVariable String name) {
        AgentSkill meta = skillCatalog.listAll().stream()
            .filter(s -> name.equals(s.getName())).findFirst().orElse(null);
        if (meta == null) {
            return Map.of("success", false, "error", "技能不存在");
        }
        boolean newEnabled = meta.getEnabled() == null || meta.getEnabled() != 1;
        skillCatalog.saveMeta(name, meta.getDescription(), meta.getKind(), newEnabled);
        return Map.of("success", true, "enabled", newEnabled);
    }

    /** 删除技能 */
    @DeleteMapping("{name}")
    public Map<String, Object> delete(@PathVariable String name) {
        AgentSkill meta = skillCatalog.listAll().stream()
            .filter(s -> name.equals(s.getName())).findFirst().orElse(null);
        if (meta == null) {
            return Map.of("success", false, "error", "技能不存在");
        }
        skillCatalog.saveMeta(name, meta.getDescription(), meta.getKind(), false);
        // 逻辑删除所有文件
        skillCatalog.getFiles(name).forEach(f -> skillCatalog.deleteFile(name, f.getFilePath()));
        return Map.of("success", true);
    }

    /** 版本历史列表 */
    @GetMapping("{name}/history")
    public List<Map<String, Object>> history(@PathVariable String name) {
        return skillCatalog.getVersions(name).stream().map(h -> Map.<String, Object>of(
            "version", h.getVersion(),
            "changedBy", h.getChangedBy() != null ? h.getChangedBy() : "",
            "createdAt", h.getCreatedAt() != null ? h.getCreatedAt() : ""
        )).collect(Collectors.toList());
    }

    /** 指定版本的文件快照 */
    @GetMapping("{name}/history/{version}")
    public Map<String, Object> versionFiles(@PathVariable String name, @PathVariable int version) {
        Map<String, String> files = skillCatalog.getVersionFiles(name, version);
        return Map.of("version", version, "files", files);
    }

    /** 回滚到指定版本 */
    @PostMapping("{name}/rollback/{version}")
    public Map<String, Object> rollback(@PathVariable String name, @PathVariable int version) {
        try {
            skillCatalog.rollback(name, version);
            return Map.of("success", true, "rolledBackTo", version);
        } catch (Exception e) {
            return Map.of("success", false, "error", e.getMessage());
        }
    }

    private Map<String, Object> toSummary(AgentSkill skill) {
        Map<String, Object> result = new HashMap<>();
        result.put("name", skill.getName());
        result.put("description", skill.getDescription() != null ? skill.getDescription() : "");
        result.put("kind", skill.getKind() != null ? skill.getKind() : "general");
        result.put("enabled", skill.getEnabled() != null && skill.getEnabled() == 1);
        result.put("source", skill.getSource() != null ? skill.getSource() : "user");
        result.put("version", 1);
        result.put("updatedAt", skill.getUpdatedAt() != null ? skill.getUpdatedAt() : "");
        result.put("fileCount", skillCatalog.getFiles(skill.getName()).size());
        return result;
    }

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
