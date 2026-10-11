package cn.boommanpro.gaia.workflow.app.agent.tool;

import cn.hutool.json.JSONObject;
import io.agentscope.core.message.TextBlock;
import io.agentscope.core.message.ToolResultBlock;
import io.agentscope.core.message.ToolResultState;
import io.agentscope.core.tool.ToolBase;
import io.agentscope.core.tool.ToolCallParam;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.BiFunction;

/**
 * 自研 {@link ToolExecutor} → AgentScope {@code ToolBase} 的桥接器。
 *
 * <p>AgentScope Java 2.0 接管推理循环后，13 个既有工具执行器（含门禁/预校验/
 * 指标落库/事件外发的完整管道）通过本适配器注册进 AgentScope 的 Toolkit，
 * 业务语义零改动 —— 换的是循环内核，不是工具层。</p>
 *
 * <p>执行管道由 {@code AgentScopeExecutionEngine} 以闭包注入：
 * 适配器只负责协议转换（参数 Map→JSONObject、ToolResult→ToolResultBlock），
 * 阻塞执行全部调度到 boundedElastic，不占用 reactor 事件线程。</p>
 */
public class AgentScopeToolAdapter extends ToolBase {

    /** 引擎注入的执行管道：(toolUseBlock 信息, 解析后的 args) → 自研 ToolResult */
    private final BiFunction<ToolCallParam, JSONObject, ToolResult> pipeline;

    /** 读类工具（无副作用、可并发）：决定 AgentScope 的并行调度与权限默认 */
    private final boolean readOnly;

    public AgentScopeToolAdapter(String name, String description, JSONObject parameters,
                                 boolean readOnly, BiFunction<ToolCallParam, JSONObject, ToolResult> pipeline) {
        super(ToolBase.builder()
            .name(name)
            .description(description != null ? description : name)
            .inputSchema(toSchemaMap(parameters))
            .readOnly(readOnly)
            .concurrencySafe(readOnly));
        this.pipeline = pipeline;
        this.readOnly = readOnly;
    }

    @Override
    public Mono<ToolResultBlock> callAsync(ToolCallParam param) {
        return Mono.fromCallable(() -> {
            JSONObject args = param.getInput() != null
                ? new JSONObject(new LinkedHashMap<>(param.getInput()))
                : new JSONObject();
            ToolResult result;
            try {
                result = pipeline.apply(param, args);
            } catch (Exception e) {
                result = ToolResult.fail("{\"error\":\"" + e.getMessage() + "\"}", "工具执行异常");
            }
            String callId = param.getToolUseBlock() != null ? param.getToolUseBlock().getId() : "";
            ToolResultState state = result.isSuccess() ? ToolResultState.SUCCESS : ToolResultState.ERROR;
            TextBlock output = TextBlock.builder()
                .text(result.getPayload() != null ? result.getPayload() : "").build();
            return new ToolResultBlock(callId, getName(), output).withState(state);
        }).subscribeOn(Schedulers.boundedElastic());
    }

    /** hutool JSONObject（DB 里的 parameters schema）→ AgentScope 期望的 Map 入参 schema */
    private static Map<String, Object> toSchemaMap(JSONObject parameters) {
        Map<String, Object> schema = new LinkedHashMap<>();
        if (parameters != null) {
            for (String key : parameters.keySet()) {
                schema.put(key, parameters.get(key));
            }
        }
        if (schema.isEmpty()) {
            schema.put("type", "object");
            schema.put("properties", new LinkedHashMap<>());
        }
        return schema;
    }
}
