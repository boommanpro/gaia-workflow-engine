package cn.boommanpro.gaia.workflow.app.agent.context;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 上下文提供者注册中心（Registry 模式）。
 *
 * 装配规则：按 AgentDefinition 声明过滤 → 按 order 排序 → 逐个 build → 拼接。
 */
@Slf4j
@Component
public class ContextProviderRegistry {

    private final Map<String, ContextProvider> providers = new ConcurrentHashMap<>();

    public void register(ContextProvider provider) {
        if (provider == null || provider.id() == null) {
            throw new IllegalArgumentException("provider and provider.id() must not be null");
        }
        providers.put(provider.id(), provider);
        log.info("[context-registry] registered provider '{}' order={}", provider.id(), provider.order());
    }

    public void unregister(String id) {
        providers.remove(id);
    }

    public List<ContextProvider> listAll() {
        List<ContextProvider> list = new ArrayList<>(providers.values());
        list.sort((a, b) -> Integer.compare(a.order(), b.order()));
        return Collections.unmodifiableList(list);
    }

    /**
     * 按 Agent 定义装配上下文。
     *
     * @param allowedIds 该 Agent 启用的提供者 id；为空表示启用全部
     * @return 拼接好的上下文文本，可能为 null
     */
    public String assemble(List<String> allowedIds, AgentRunContext context) {
        List<ContextProvider> candidates = listAll();
        StringBuilder builder = new StringBuilder();

        for (ContextProvider provider : candidates) {
            if (allowedIds != null && !allowedIds.isEmpty() && !allowedIds.contains(provider.id())) {
                continue;
            }
            if (!provider.enabled() || !provider.supports(context)) {
                continue;
            }
            try {
                String text = provider.build(context);
                if (text == null || text.trim().isEmpty()) {
                    continue;
                }
                builder.append("\n\n### ").append(provider.name()).append("\n").append(text.trim());
            } catch (Exception e) {
                // 单个上下文失败不能拖垮整次会话 —— 降级跳过即可
                log.warn("[context-registry] provider '{}' failed: {}", provider.id(), e.getMessage());
            }
        }

        return builder.length() == 0 ? null : builder.toString();
    }

    public int size() {
        return providers.size();
    }
}
