package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSkill;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSkillFile;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSkillHistory;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSkillFileService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSkillHistoryService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSkillService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 技能目录（多文件版，2026-10-17 反馈重设计）。
 *
 * <p>技能 = 一个目录：SKILL.md 为入口 + references/ 引用文件。
 * 三层渐进加载：①目录条目注入系统提示词 ②skill(name) 拉取 SKILL.md 全文 ③skill(name/path) 拉取引用文件。</p>
 *
 * <p>启用 = 挂载（AgentScope toolkit 一体语义）：enabled 即在目录 + 可加载。</p>
 */
@Slf4j
@Service
public class AgentSkillCatalog {

    public static final String GAIA_WORKFLOW_ASSISTANT = "gaia-workflow-assistant";
    public static final String SKILL_MD = "SKILL.md";

    private final AgentSkillService skillService;
    private final AgentSkillFileService fileService;
    private final AgentSkillHistoryService historyService;

    private volatile boolean migrated = false;

    public AgentSkillCatalog(AgentSkillService skillService,
                             AgentSkillFileService fileService,
                             AgentSkillHistoryService historyService) {
        this.skillService = skillService;
        this.fileService = fileService;
        this.historyService = historyService;
    }

    @PostConstruct
    public void warmup() { ensureMigrated(); }

    // ===== 查询 =====

    public List<AgentSkill> catalog() {
        ensureMigrated();
        return skillService.list(new QueryWrapper<AgentSkill>()
            .eq("enabled", 1).eq("is_deleted", 0).orderByAsc("kind", "name"));
    }

    public AgentSkill getMeta(String name) {
        ensureMigrated();
        return skillService.getOne(new QueryWrapper<AgentSkill>()
            .eq("name", name).eq("enabled", 1).eq("is_deleted", 0).last("LIMIT 1"));
    }

    public List<AgentSkillFile> getFiles(String skillName) {
        ensureMigrated();
        return fileService.list(new QueryWrapper<AgentSkillFile>()
            .eq("skill_name", skillName).eq("is_deleted", 0).orderByAsc("file_path"));
    }

    public AgentSkillFile getFile(String skillName, String filePath) {
        ensureMigrated();
        return fileService.getOne(new QueryWrapper<AgentSkillFile>()
            .eq("skill_name", skillName).eq("file_path", filePath)
            .eq("is_deleted", 0).last("LIMIT 1"));
    }

    /** 取 SKILL.md 主入口文件 */
    public AgentSkillFile getMainFile(String skillName) {
        return getFile(skillName, SKILL_MD);
    }

    public List<AgentSkill> listAll() {
        ensureMigrated();
        return skillService.list(new QueryWrapper<AgentSkill>()
            .eq("is_deleted", 0).orderByAsc("kind", "name"));
    }

    // ===== 写入 =====

    public AgentSkill saveMeta(String name, String description, String kind, boolean enabled) {
        AgentSkill existing = skillService.getOne(new QueryWrapper<AgentSkill>().eq("name", name));
        AgentSkill skill = existing != null ? existing : new AgentSkill();
        skill.setName(name);
        skill.setDescription(description);
        skill.setKind(kind != null ? kind : "general");
        skill.setEnabled(enabled ? 1 : 0);
        skill.setUpdatedAt(LocalDateTime.now().toString());
        skillService.saveOrUpdate(skill);
        return skill;
    }

    public void saveFile(String skillName, String filePath, String content, String changedBy) {
        saveFileRaw(skillName, filePath, content);
        archiveVersion(skillName, changedBy != null ? changedBy : "admin");
    }

    public void saveFiles(String skillName, Map<String, String> files, String changedBy) {
        files.forEach((path, content) -> saveFileRaw(skillName, path, content));
        archiveVersion(skillName, changedBy != null ? changedBy : "admin");
    }

    public void deleteFile(String skillName, String filePath) {
        AgentSkillFile file = getFile(skillName, filePath);
        if (file != null) fileService.removeById(file.getId());
    }

    private void saveFileRaw(String skillName, String filePath, String content) {
        AgentSkillFile existing = getFile(skillName, filePath);
        AgentSkillFile file = existing != null ? existing : new AgentSkillFile();
        file.setSkillName(skillName);
        file.setFilePath(filePath);
        file.setContent(content);
        file.setUpdatedAt(LocalDateTime.now().toString());
        if (existing == null) file.setCreatedAt(LocalDateTime.now().toString());
        fileService.saveOrUpdate(file);
    }

    // ===== 版本历史 =====

    public void archiveVersion(String skillName, String changedBy) {
        try {
            int nextVersion = 1;
            AgentSkillHistory latest = historyService.getOne(new QueryWrapper<AgentSkillHistory>()
                .eq("skill_name", skillName).orderByDesc("version").last("LIMIT 1"));
            if (latest != null) nextVersion = latest.getVersion() + 1;
            List<AgentSkillFile> files = getFiles(skillName);
            JSONArray filesJson = new JSONArray();
            for (AgentSkillFile f : files) {
                filesJson.add(new cn.hutool.json.JSONObject()
                    .set("path", f.getFilePath()).set("content", f.getContent()));
            }
            AgentSkillHistory history = new AgentSkillHistory();
            history.setSkillName(skillName);
            history.setVersion(nextVersion);
            history.setFilesJson(filesJson.toString());
            history.setChangedBy(changedBy);
            history.setCreatedAt(LocalDateTime.now().toString());
            historyService.save(history);
        } catch (Exception e) {
            log.warn("[skill-catalog] archive failed for {}: {}", skillName, e.getMessage());
        }
    }

    public List<AgentSkillHistory> getVersions(String skillName) {
        return historyService.list(new QueryWrapper<AgentSkillHistory>()
            .eq("skill_name", skillName).orderByDesc("version"));
    }

    public Map<String, String> getVersionFiles(String skillName, int version) {
        AgentSkillHistory history = historyService.getOne(new QueryWrapper<AgentSkillHistory>()
            .eq("skill_name", skillName).eq("version", version).last("LIMIT 1"));
        if (history == null) return Map.of();
        Map<String, String> result = new HashMap<>();
        JSONArray arr = JSONUtil.parseArray(history.getFilesJson());
        for (Object item : arr) {
            cn.hutool.json.JSONObject entry = (cn.hutool.json.JSONObject) item;
            result.put(entry.getStr("path"), entry.getStr("content"));
        }
        return result;
    }

    public void rollback(String skillName, int version) {
        Map<String, String> files = getVersionFiles(skillName, version);
        files.forEach((path, content) -> saveFileRaw(skillName, path, content));
        archiveVersion(skillName, "rollback-to-v" + version);
    }

    // ===== 系统提示词目录注入 =====

    public String renderCatalogSection() {
        List<AgentSkill> skills = catalog();
        if (skills.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("\n\n## 技能目录（skill(name) 可取全文）\n");
        for (AgentSkill skill : skills) {
            sb.append("- `").append(skill.getName()).append("`");
            if (skill.getDescription() != null && !skill.getDescription().isEmpty())
                sb.append("：").append(skill.getDescription());
            sb.append('\n');
        }
        sb.append("开工第一步：skill(\"gaia-workflow-assistant\") 加载完整搭建手册。\n");
        return sb.toString();
    }

    // ===== Seed 迁移 =====

    private static final String SKILL_ROOT = "agent/skills/" + GAIA_WORKFLOW_ASSISTANT + "/";

    /** 随 classpath 一起发布的技能文件（相对技能根目录） */
    private static final String[] SEED_FILES = {
        SKILL_MD,
        "references/tool-chain.md",
        "references/node-data-rules.md",
        "references/edge-rules.md",
        "examples/contains-workflow.md",
    };

    /** 节点知识的事实源：每个条目生成一份 references/node_&lt;type&gt;.md，供 get(target=knowledge) 读取 */
    private static final String NODE_KNOWLEDGE_SEED = "seed/node-knowledge.json";

    /**
     * 幂等补种：技能元数据缺失则建；文件只补缺失项（已有文件可能被用户在技能库里改过，不覆盖）。
     * 任何一步失败都把 migrated 复位，下次调用重试。
     */
    @PostConstruct
    public synchronized void ensureMigrated() {
        if (migrated) return;
        // 先置位：saveFileRaw → getFile 会重入本方法，必须直接返回而不是再走一遍种子逻辑
        migrated = true;
        try {
            boolean createdSkill = false;
            if (skillService.count(new QueryWrapper<AgentSkill>().eq("name", GAIA_WORKFLOW_ASSISTANT)) == 0) {
                AgentSkill skill = new AgentSkill();
                skill.setName(GAIA_WORKFLOW_ASSISTANT);
                skill.setDescription("工作流搭建完整操作手册");
                skill.setKind("domain");
                skill.setEnabled(1);
                skill.setSource("seed");
                skill.setUpdatedAt(LocalDateTime.now().toString());
                skillService.save(skill);
                createdSkill = true;
            }
            int added = 0;
            for (String relPath : SEED_FILES) {
                added += seedFileIfMissing(relPath, readClasspath(SKILL_ROOT + relPath));
            }
            added += seedNodeKnowledgeFiles();
            if (createdSkill || added > 0) {
                archiveVersion(GAIA_WORKFLOW_ASSISTANT, "seed");
                log.info("[skill-catalog] seeded {}: skill={}, files={}", GAIA_WORKFLOW_ASSISTANT, createdSkill, added);
            }
        } catch (Exception e) {
            migrated = false;
            log.warn("[skill-catalog] migration deferred: {}", e.getMessage());
        }
    }

    private int seedNodeKnowledgeFiles() {
        String json = readClasspath(NODE_KNOWLEDGE_SEED);
        if (json == null || json.isEmpty()) return 0;
        int added = 0;
        JSONArray entries = JSONUtil.parseArray(json);
        for (int i = 0; i < entries.size(); i++) {
            cn.hutool.json.JSONObject entry = entries.getJSONObject(i);
            String nodeType = entry.getStr("nodeType");
            if (nodeType == null || nodeType.isEmpty()) continue;
            added += seedFileIfMissing("references/node_" + nodeType + ".md", entry.getStr("content"));
        }
        return added;
    }

    private int seedFileIfMissing(String relPath, String content) {
        if (content == null || content.isEmpty()) return 0;
        if (getFile(GAIA_WORKFLOW_ASSISTANT, relPath) != null) return 0;
        saveFileRaw(GAIA_WORKFLOW_ASSISTANT, relPath, content);
        return 1;
    }

    private String readClasspath(String path) {
        try {
            ClassPathResource resource = new ClassPathResource(path);
            try (InputStream is = resource.getInputStream()) {
                byte[] buffer = new byte[8192];
                java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
                int n;
                while ((n = is.read(buffer)) != -1) out.write(buffer, 0, n);
                return new String(out.toByteArray(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) { return null; }
    }
}
