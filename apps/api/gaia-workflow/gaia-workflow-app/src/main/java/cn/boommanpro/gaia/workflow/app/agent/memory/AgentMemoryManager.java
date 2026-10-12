package cn.boommanpro.gaia.workflow.app.agent.memory;

import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentMemory;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentMemoryService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.regex.Pattern;

/**
 * 双层记忆管理器（owb memory 对标，2026-10-11）：
 * 手写区（agent_config: memory.manual，界面编辑）+ 条目区（agent_memory 表，remember 工具自记）。
 * 拼装进系统提示词前截断；写前正则拦密钥（防一条坏记忆带偏所有后续任务）。
 */
@Slf4j
@Service
public class AgentMemoryManager {

    public static final String MANUAL_KEY = "memory.manual";
    /** 条目区上限（owb 同款策略：超量丢最旧） */
    private static final int MAX_ENTRIES = 30;
    /** 单条长度上限 */
    private static final int MAX_ENTRY_CHARS = 300;
    /** 提示词注入总预算 */
    private static final int PROMPT_BUDGET = 2000;

    /** 密钥形态拦截（写侧防线） */
    private static final Pattern SECRET_PATTERN = Pattern.compile(
        "(sk-[A-Za-z0-9]{16,}|api[_-]?key\\s*[:=]\\s*\\S{8,}|bearer\\s+\\S{16,}|password\\s*[:=]\\s*\\S{6,})",
        Pattern.CASE_INSENSITIVE);

    private final AgentMemoryService memoryService;
    private final AgentConfigService configService;

    public AgentMemoryManager(AgentMemoryService memoryService, AgentConfigService configService) {
        this.memoryService = memoryService;
        this.configService = configService;
    }

    /** 手写区内容（可空） */
    public String manualSection() {
        try {
            AgentConfig config = configService.getOne(
                new QueryWrapper<AgentConfig>().eq("config_key", MANUAL_KEY).last("LIMIT 1"));
            return config != null ? config.getContent() : null;
        } catch (Exception e) {
            return null;
        }
    }

    /** 条目区（最新在前） */
    public List<AgentMemory> entries() {
        return memoryService.list(
            new QueryWrapper<AgentMemory>().orderByDesc("id").last("LIMIT " + MAX_ENTRIES));
    }

    /** 拼装提示词注入段（预算内截断；两层都空返回 null） */
    public String buildPromptSection() {
        String manual = manualSection();
        List<AgentMemory> entries = entries();
        boolean hasManual = manual != null && !manual.trim().isEmpty();
        if (!hasManual && entries.isEmpty()) {
            return null;
        }
        StringBuilder sb = new StringBuilder("\n\n## 长期记忆（跨会话生效；remember/forget 工具可增删）\n");
        if (hasManual) {
            sb.append("### 平台约定（手写）\n");
            String trimmed = manual.length() > PROMPT_BUDGET / 2
                ? manual.substring(0, PROMPT_BUDGET / 2) + "…（已截断）" : manual;
            sb.append(trimmed).append('\n');
        }
        if (!entries.isEmpty()) {
            sb.append("### 偏好与事实（条目）\n");
            int used = sb.length();
            for (AgentMemory m : entries) {
                String line = "- " + (m.getContent().length() > MAX_ENTRY_CHARS
                    ? m.getContent().substring(0, MAX_ENTRY_CHARS) + "…" : m.getContent());
                if (used + line.length() > PROMPT_BUDGET) {
                    break;
                }
                sb.append(line).append('\n');
                used += line.length();
            }
        }
        return sb.toString();
    }

    /** 保存手写区（界面编辑；空内容 = 清空） */
    public void saveManual(String content) {
        String now = LocalDateTime.now().toString();
        AgentConfig config = configService.getOne(
            new QueryWrapper<AgentConfig>().eq("config_key", MANUAL_KEY).last("LIMIT 1"));
        if (config == null) {
            config = new AgentConfig();
            config.setConfigKey(MANUAL_KEY);
            config.setConfigType("memory");
            config.setTitle("长期记忆 · 手写区");
            config.setContent(content == null ? "" : content);
            config.setCreatedAt(now);
            config.setUpdatedAt(now);
            configService.save(config);
        } else {
            config.setContent(content == null ? "" : content);
            config.setUpdatedAt(now);
            configService.updateById(config);
        }
    }

    /** remember：去重 + 密钥拦截 + 超量丢最旧；返回结果文案 */
    public String remember(String content) {
        if (content == null || content.trim().isEmpty()) {
            return "内容为空，未记录";
        }
        String text = content.trim();
        if (SECRET_PATTERN.matcher(text).find()) {
            return "内容疑似包含密钥/凭据，已拒绝记录（记忆不存密钥）";
        }
        List<AgentMemory> existing = entries();
        for (AgentMemory m : existing) {
            if (m.getContent().trim().equals(text)) {
                return "已有相同记忆，未重复记录";
            }
        }
        String now = LocalDateTime.now().toString();
        AgentMemory entry = new AgentMemory();
        entry.setScope("global");
        entry.setContent(text);
        entry.setSource("agent");
        entry.setCreatedAt(now);
        entry.setUpdatedAt(now);
        memoryService.save(entry);
        long total = memoryService.count();
        if (total > MAX_ENTRIES) {
            AgentMemory oldest = memoryService.getOne(
                new QueryWrapper<AgentMemory>().orderByAsc("id").last("LIMIT 1"));
            if (oldest != null) {
                memoryService.removeById(oldest.getId());
            }
        }
        return "已记住：" + (text.length() > 80 ? text.substring(0, 80) + "…" : text);
    }

    /** forget：按关键词删除（内容包含关键词即删）；返回删除数 */
    public int forget(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return 0;
        }
        List<AgentMemory> matched = memoryService.list(
            new QueryWrapper<AgentMemory>().like("content", keyword.trim()));
        matched.forEach(m -> memoryService.removeById(m.getId()));
        return matched.size();
    }
}
