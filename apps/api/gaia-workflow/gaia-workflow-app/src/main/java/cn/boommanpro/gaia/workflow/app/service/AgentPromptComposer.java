package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentPromptConfig;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentPromptConfigService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Agent 人设/规范/压缩提示词配置服务（2026-10-17 期4）。
 *
 * <p>四个配置键：{@code identity / soul / agents / compaction}。
 * 读取优先级：DB（agent_prompt_config，scope=global）→ classpath 默认值
 * （resources/agent/config/&lt;key&gt;.md）。DB 无记录 = 使用默认；保存即版本自增。</p>
 *
 * <p>消费方：{@link AgentToolRegistry#getSystemPrompt}（identity/soul/agents 组装系统提示词，
 * 三引擎经 SystemPromptResolver 同源生效）、SessionCompactionService（compaction 压缩指令）。</p>
 */
@Slf4j
@Service
public class AgentPromptComposer {

    public static final String KEY_IDENTITY = "identity";
    public static final String KEY_SOUL = "soul";
    public static final String KEY_AGENTS = "agents";
    public static final String KEY_COMPACTION = "compaction";

    private static final Map<String, String> KEY_TITLES = new LinkedHashMap<>();

    static {
        KEY_TITLES.put(KEY_IDENTITY, "身份（IDENTITY）");
        KEY_TITLES.put(KEY_SOUL, "性格与语气（SOUL）");
        KEY_TITLES.put(KEY_AGENTS, "工作规范（AGENTS）");
        KEY_TITLES.put(KEY_COMPACTION, "上下文压缩提示词（COMPACTION）");
    }

    private final AgentPromptConfigService configService;

    public AgentPromptComposer(AgentPromptConfigService configService) {
        this.configService = configService;
    }

    /** 读取配置内容：DB 优先，classpath 兜底；都无返回空串 */
    public String load(String key) {
        try {
            AgentPromptConfig config = getByKey(key);
            if (config != null && config.getContent() != null && !config.getContent().isEmpty()) {
                return config.getContent();
            }
        } catch (Exception e) {
            log.warn("[prompt-config] load '{}' from DB failed, fallback classpath: {}", key, e.getMessage());
        }
        return readClasspathDefault(key);
    }

    /** classpath 默认值 */
    public String readClasspathDefault(String key) {
        try {
            ClassPathResource resource = new ClassPathResource("agent/config/" + key + ".md");
            try (InputStream is = resource.getInputStream()) {
                byte[] buffer = new byte[8192];
                java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
                int n;
                while ((n = is.read(buffer)) != -1) {
                    out.write(buffer, 0, n);
                }
                return new String(out.toByteArray(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            log.warn("[prompt-config] classpath default missing: {}", key);
            return "";
        }
    }

    /** 保存配置（版本自增；内容为空视为恢复默认=删除 DB 行） */
    public boolean save(String key, String content, String updatedBy) {
        if (!KEY_TITLES.containsKey(key)) {
            return false;
        }
        try {
            AgentPromptConfig existing = getByKey(key);
            if (content == null || content.trim().isEmpty()) {
                if (existing != null) {
                    configService.removeById(existing.getId());
                }
                return true;
            }
            if (existing == null) {
                existing = new AgentPromptConfig();
                existing.setConfigKey(key);
                existing.setVersion(1);
                existing.setScope("global");
            } else {
                existing.setVersion((existing.getVersion() != null ? existing.getVersion() : 1) + 1);
            }
            existing.setContent(content);
            existing.setUpdatedBy(updatedBy != null ? updatedBy : "admin");
            existing.setUpdatedAt(LocalDateTime.now().toString());
            configService.saveOrUpdate(existing);
            return true;
        } catch (Exception e) {
            log.error("[prompt-config] save '{}' failed", key, e);
            return false;
        }
    }

    /** 组装系统提示词正文：IDENTITY → SOUL → AGENTS（段序固定，保前缀缓存） */
    public String composeSystemPrompt() {
        StringBuilder sb = new StringBuilder();
        appendSection(sb, load(KEY_IDENTITY));
        appendSection(sb, load(KEY_SOUL));
        appendSection(sb, load(KEY_AGENTS));
        return sb.toString();
    }

    /** 压缩提示词（COMPACTION；一次性指令，不进 system prompt） */
    public String loadCompactionPrompt() {
        String prompt = load(KEY_COMPACTION);
        // 去掉版本标记注释行
        return prompt.replaceAll("(?m)^<!--.*-->\\s*", "").trim();
    }

    /** 四个配置键的当前内容（管理页展示用） */
    public Map<String, Object> describeAll() {
        Map<String, Object> result = new LinkedHashMap<>();
        for (String key : KEY_TITLES.keySet()) {
            AgentPromptConfig config = null;
            try {
                config = getByKey(key);
            } catch (Exception ignored) {
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("key", key);
            item.put("title", KEY_TITLES.get(key));
            item.put("content", load(key));
            item.put("overridden", config != null);
            item.put("version", config != null ? config.getVersion() : 0);
            result.put(key, item);
        }
        return result;
    }

    public boolean isValidKey(String key) {
        return KEY_TITLES.containsKey(key);
    }

    private AgentPromptConfig getByKey(String key) {
        return configService.getOne(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<AgentPromptConfig>()
                .eq("config_key", key)
                .last("LIMIT 1"));
    }

    private void appendSection(StringBuilder sb, String content) {
        if (content != null && !content.trim().isEmpty()) {
            if (sb.length() > 0) {
                sb.append("\n\n");
            }
            sb.append(content.trim());
        }
    }
}
