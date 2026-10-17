package cn.boommanpro.gaia.workflow.app.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;

/**
 * workflow-architect 人设提示词同步：classpath 是唯一事实源，DB 里的拷贝在内容未被手工修改时跟随更新。
 *
 * <p>表结构不在这里演进——schema.sql 即最终版（CREATE TABLE IF NOT EXISTS + 退役表 DROP）。</p>
 *
 * <p>同步用哈希比对而非一次性 marker：每个提示词在 agent.prompt.imported_hash.{configKey}
 * 记录上次导入的内容哈希——DB 内容与哈希一致（没人手工改过）就跟随 classpath 更新；
 * 不一致（管理后台改过）则跳过，保护人工修改。</p>
 *
 * <p>默认助手的系统提示词走 {@code agent_prompt_config}（identity/soul/agents，见 AgentPromptComposer），
 * 不经此处。</p>
 */
@Slf4j
@Component
public class AgentPromptSyncer {

    private final JdbcTemplate jdbc;

    public AgentPromptSyncer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostConstruct
    public void syncPrompts() {
        try {
            syncPrompt("system_prompt.workflow-architect", "agent/prompt-workflow-architect-zh.md");
            syncPrompt("system_prompt.workflow-architect.en", "agent/prompt-workflow-architect-en.md");
        } catch (Exception e) {
            log.warn("[prompt-sync] failed: {}", e.getMessage());
        }
    }

    private void syncPrompt(String configKey, String resourcePath) {
        try {
            String classpathContent = readResource(resourcePath);
            if (classpathContent == null || classpathContent.trim().isEmpty()) {
                return;
            }
            String classpathHash = sha256(classpathContent);
            String dbContent = queryConfigContent(configKey);
            String importedHash = queryConfigContent("agent.prompt.imported_hash." + configKey);
            // 只有存在哈希基线且内容对不上才算手工编辑；首次接管（无基线）一律导入
            boolean dbManuallyEdited = dbContent != null && importedHash != null
                && !sha256(dbContent).equals(importedHash);
            if (dbManuallyEdited) {
                log.info("[prompt-sync] {} manually edited in DB, skip", configKey);
                return;
            }
            if (dbContent != null && classpathHash.equals(importedHash)) {
                return;
            }
            upsertConfig(configKey, "system_prompt", configKey, classpathContent,
                "从 " + resourcePath + " 导入（内容变更自动同步）");
            upsertConfig("agent.prompt.imported_hash." + configKey, "migration_marker",
                configKey + " 导入哈希", classpathHash, "提示词同步哈希，勿改");
            log.info("[prompt-sync] {} synced from {}", configKey, resourcePath);
        } catch (Exception e) {
            log.warn("[prompt-sync] {} failed: {}", configKey, e.getMessage());
        }
    }

    private String queryConfigContent(String configKey) {
        try {
            return jdbc.queryForObject(
                "SELECT content FROM agent_config WHERE config_key = ?", String.class, configKey);
        } catch (Exception e) {
            return null;
        }
    }

    private void upsertConfig(String configKey, String configType, String title, String content, String description) {
        Integer exists = jdbc.queryForObject(
            "SELECT COUNT(*) FROM agent_config WHERE config_key = ?", Integer.class, configKey);
        if (exists != null && exists > 0) {
            jdbc.update("UPDATE agent_config SET content = ?, description = ?, updated_at = datetime('now') "
                + "WHERE config_key = ?", content, description, configKey);
        } else {
            jdbc.update("INSERT INTO agent_config (config_key, config_type, title, content, description, created_at, updated_at) "
                    + "VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
                configKey, configType, title, content, description);
        }
    }

    private static String sha256(String content) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(content.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return String.valueOf(content.hashCode());
        }
    }

    private static String readResource(String path) {
        try (java.io.InputStream is = new ClassPathResource(path).getInputStream()) {
            java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
            byte[] data = new byte[4096];
            int n;
            while ((n = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, n);
            }
            return new String(buffer.toByteArray(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }
}
