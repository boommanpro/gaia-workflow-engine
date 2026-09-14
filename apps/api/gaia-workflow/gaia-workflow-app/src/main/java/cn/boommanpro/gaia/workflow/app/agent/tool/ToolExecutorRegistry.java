package cn.boommanpro.gaia.workflow.app.agent.tool;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 工具执行器注册中心（Registry 模式）。
 *
 * <p>工具不再是「后端写死 schema + 前端写死 switch」的一对硬编码，
 * 而是可以在运行时注册 / 卸载的实现类。</p>
 */
@Slf4j
@Component
public class ToolExecutorRegistry {

    private final Map<String, ToolExecutor> executors = new ConcurrentHashMap<>();

    public void register(ToolExecutor executor) {
        if (executor == null || executor.name() == null) {
            throw new IllegalArgumentException("executor and executor.name() must not be null");
        }
        executors.put(executor.name(), executor);
        log.info("[tool-registry] registered executor '{}' surface={}", executor.name(), executor.surface());
    }

    public void unregister(String name) {
        ToolExecutor removed = executors.remove(name);
        if (removed != null) {
            log.info("[tool-registry] unregistered executor '{}'", name);
        }
    }

    public Optional<ToolExecutor> get(String name) {
        return name == null ? Optional.empty() : Optional.ofNullable(executors.get(name));
    }

    /**
     * 该工具能否由后端直接执行（自治模式）。
     * 找不到执行器也算不能 —— 宁可明确告诉模型「不可用」，也不要挂起等待。
     */
    public boolean isBackendExecutable(String name) {
        return get(name).map(ToolExecutor::canRunOnBackend).orElse(false);
    }

    public Collection<ToolExecutor> listAll() {
        return Collections.unmodifiableCollection(executors.values());
    }

    public int size() {
        return executors.size();
    }
}
