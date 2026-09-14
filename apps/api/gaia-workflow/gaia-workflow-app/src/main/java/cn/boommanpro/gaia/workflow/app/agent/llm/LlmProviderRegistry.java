package cn.boommanpro.gaia.workflow.app.agent.llm;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * LLM 供应商注册中心（Registry + 缺省兜底）。
 *
 * <p>AgentDefinition 通过 {@code llmProviderId} 引用供应商；
 * 未指定或指定的供应商不存在时，回退到默认供应商，保证不会因为换模型导致整个系统不可用。</p>
 */
@Slf4j
@Component
public class LlmProviderRegistry {

    private final Map<String, LlmProvider> providers = new ConcurrentHashMap<>();

    /** 默认供应商 id，注册第一个可用供应商时自动设置 */
    private volatile String defaultProviderId;

    public void register(LlmProvider provider) {
        if (provider == null || provider.getId() == null) {
            throw new IllegalArgumentException("provider and provider.id must not be null");
        }
        providers.put(provider.getId(), provider);
        if (defaultProviderId == null) {
            defaultProviderId = provider.getId();
        }
        log.info("[llm-registry] registered provider '{}' ({})", provider.getId(), provider.getName());
    }

    public void unregister(String providerId) {
        providers.remove(providerId);
        if (providerId.equals(defaultProviderId)) {
            defaultProviderId = providers.keySet().stream().findFirst().orElse(null);
        }
        log.info("[llm-registry] unregistered provider '{}'", providerId);
    }

    /**
     * 解析供应商：指定优先 → 默认 → 任意一个可用的。
     */
    public Optional<LlmProvider> resolve(String providerId) {
        if (providerId != null && !providerId.isEmpty()) {
            LlmProvider exact = providers.get(providerId);
            if (exact != null) {
                return Optional.of(exact);
            }
            log.warn("[llm-registry] provider '{}' not found, falling back", providerId);
        }
        if (defaultProviderId != null) {
            LlmProvider fallback = providers.get(defaultProviderId);
            if (fallback != null) {
                return Optional.of(fallback);
            }
        }
        return providers.values().stream().filter(LlmProvider::isAvailable).findFirst();
    }

    /** 强制设为默认供应商 */
    public void setDefault(String providerId) {
        if (providers.containsKey(providerId)) {
            this.defaultProviderId = providerId;
        }
    }

    public List<LlmProvider> listAll() {
        return Collections.unmodifiableList(new ArrayList<>(providers.values()));
    }

    public String getDefaultProviderId() {
        return defaultProviderId;
    }
}
