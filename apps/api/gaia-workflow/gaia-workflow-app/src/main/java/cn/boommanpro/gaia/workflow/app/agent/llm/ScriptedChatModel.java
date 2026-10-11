package cn.boommanpro.gaia.workflow.app.agent.llm;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import io.agentscope.core.message.ContentBlock;
import io.agentscope.core.message.Msg;
import io.agentscope.core.message.TextBlock;
import io.agentscope.core.message.ThinkingBlock;
import io.agentscope.core.message.ToolUseBlock;
import io.agentscope.core.model.ChatModelBase;
import io.agentscope.core.model.ChatResponse;
import io.agentscope.core.model.ChatUsage;
import io.agentscope.core.model.GenerateOptions;
import io.agentscope.core.model.ToolSchema;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 脚本化模型 —— 录制轨迹回放的 mock LLM（dsh trajectory-replay 同款测试基建）。
 *
 * <p>实现 AgentScope {@code Model} 接口，按脚本逐次回放「思考 → 正文 → 工具调用」，
 * 每次 {@code stream()} 消耗一条响应；脚本耗尽后复用最后一条（loopLast）。
 * 有了它，引擎全链路（ReAct 循环 / 工具执行 / 持久化 / 事件协议）的测试验收
 * 完全不依赖真实大模型 —— 慢 LLM 与方舟预算都不再是回归验证的阻塞项。</p>
 *
 * <p>脚本格式（classpath 或文件路径）：</p>
 * <pre>{@code
 * {
 *   "modelName": "scripted",
 *   "loopLast": false,
 *   "responses": [
 *     { "thinking": ["先读定义。"],
 *       "text": [],
 *       "toolCalls": [{ "id": "call-1", "name": "read_workflow", "arguments": "{}" }] },
 *     { "text": ["结构正常。"] }
 *   ]
 * }
 * }</pre>
 */
@Slf4j
public class ScriptedChatModel extends ChatModelBase {

    private final String modelName;
    private final List<ScriptedResponse> responses;
    private final boolean loopLast;
    private final AtomicInteger cursor = new AtomicInteger();

    private ScriptedChatModel(String modelName, List<ScriptedResponse> responses, boolean loopLast) {
        this.modelName = modelName;
        this.responses = responses;
        this.loopLast = loopLast;
    }

    public static ScriptedChatModel fromResource(String location) {
        String json;
        if (location != null && location.startsWith("classpath:")) {
            String path = location.substring("classpath:".length());
            if (!path.startsWith("/")) {
                path = "/" + path;
            }
            try (InputStream in = ScriptedChatModel.class.getResourceAsStream(path)) {
                if (in == null) {
                    throw new IllegalStateException("scripted trajectory not found on classpath: " + location);
                }
                json = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                throw new IllegalStateException("scripted trajectory read failed: " + location, e);
            }
        } else {
            try {
                json = Files.readString(Path.of(location));
            } catch (IOException e) {
                throw new IllegalStateException("scripted trajectory read failed: " + location, e);
            }
        }
        return fromJson(json);
    }

    static ScriptedChatModel fromJson(String json) {
        JSONObject root = JSONUtil.parseObj(json);
        String modelName = root.getStr("modelName", "scripted");
        boolean loopLast = root.getBool("loopLast", false);
        List<ScriptedResponse> responses = new ArrayList<>();
        JSONArray arr = root.getJSONArray("responses");
        if (arr != null) {
            for (Object o : arr) {
                JSONObject item = (JSONObject) o;
                ScriptedResponse r = new ScriptedResponse();
                r.thinking = strings(item.getJSONArray("thinking"));
                r.text = strings(item.getJSONArray("text"));
                JSONArray calls = item.getJSONArray("toolCalls");
                if (calls != null) {
                    for (Object c : calls) {
                        JSONObject call = (JSONObject) c;
                        r.toolCalls.add(new ToolCallSpec(
                                call.getStr("id", "call-" + r.toolCalls.size()),
                                call.getStr("name", "unknown"),
                                call.getStr("arguments", "{}")));
                    }
                }
                responses.add(r);
            }
        }
        if (responses.isEmpty()) {
            throw new IllegalStateException("scripted trajectory has no responses");
        }
        return new ScriptedChatModel(modelName, List.copyOf(responses), loopLast);
    }

    private static List<String> strings(JSONArray arr) {
        List<String> out = new ArrayList<>();
        if (arr != null) {
            for (Object o : arr) {
                if (o != null) {
                    out.add(String.valueOf(o));
                }
            }
        }
        return out;
    }

    /** 测试注入用：直接以响应列表构造 */
    public static ScriptedChatModel ofResponses(boolean loopLast, ScriptedResponse... responses) {
        return new ScriptedChatModel("scripted", List.of(responses), loopLast);
    }

    @Override
    protected Flux<ChatResponse> doStream(List<Msg> messages, List<ToolSchema> tools, GenerateOptions options) {
        if (responses.isEmpty()) {
            return Flux.empty();
        }
        int idx = cursor.getAndIncrement();
        ScriptedResponse resp;
        if (idx < responses.size()) {
            resp = responses.get(idx);
        } else if (loopLast) {
            resp = responses.get(responses.size() - 1);
        } else {
            log.warn("[scripted-model] script exhausted at call {}, replaying last response", idx);
            resp = responses.get(responses.size() - 1);
        }
        String id = "scripted-" + idx;
        List<ChatResponse> chunks = new ArrayList<>();
        for (String t : resp.thinking) {
            chunks.add(chunk(id, List.of(ThinkingBlock.builder().thinking(t).build())));
        }
        for (String t : resp.text) {
            chunks.add(chunk(id, List.of(TextBlock.builder().text(t).build())));
        }
        if (!resp.toolCalls.isEmpty()) {
            List<ContentBlock> blocks = new ArrayList<>();
            for (ToolCallSpec call : resp.toolCalls) {
                blocks.add(new ToolUseBlock(call.id(), call.name(), parseArgs(call.arguments())));
            }
            chunks.add(chunk(id, blocks, "tool_calls"));
        } else {
            chunks.add(chunk(id, Collections.emptyList(), "stop"));
        }
        return Flux.fromIterable(chunks);
    }

    private static ChatResponse chunk(String id, List<ContentBlock> blocks) {
        return chunk(id, blocks, null);
    }

    private static ChatResponse chunk(String id, List<ContentBlock> blocks, String finishReason) {
        return new ChatResponse(id, blocks, new ChatUsage(0, 0, 0.0), new HashMap<>(), finishReason);
    }

    private static Map<String, Object> parseArgs(String arguments) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (arguments == null || arguments.isBlank()) {
            return out;
        }
        try {
            JSONObject parsed = JSONUtil.parseObj(arguments);
            for (String key : parsed.keySet()) {
                out.put(key, parsed.get(key));
            }
        } catch (Exception ignored) {
            // 非法参数保持空对象，让引擎侧 schema 校验去报错（同样是回放路径的一部分）
        }
        return out;
    }

    @Override
    public String getModelName() {
        return modelName;
    }

    /** 一条脚本响应：思考/正文分片 + 工具调用 */
    public static final class ScriptedResponse {
        private List<String> thinking = new ArrayList<>();
        private List<String> text = new ArrayList<>();
        private final List<ToolCallSpec> toolCalls = new ArrayList<>();

        public static ScriptedResponse withText(String... chunks) {
            ScriptedResponse r = new ScriptedResponse();
            r.text.addAll(List.of(chunks));
            return r;
        }

        public static ScriptedResponse withThinkingAndTool(String thinking, String toolId,
                                                           String toolName, String arguments) {
            ScriptedResponse r = new ScriptedResponse();
            r.thinking.add(thinking);
            r.toolCalls.add(new ToolCallSpec(toolId, toolName, arguments));
            return r;
        }

        public ScriptedResponse thinking(String... chunks) {
            this.thinking.addAll(List.of(chunks));
            return this;
        }

        public ScriptedResponse text(String... chunks) {
            this.text.addAll(List.of(chunks));
            return this;
        }

        public ScriptedResponse toolCall(String id, String name, String arguments) {
            this.toolCalls.add(new ToolCallSpec(id, name, arguments));
            return this;
        }
    }

    /** 脚本里的一个工具调用 */
    record ToolCallSpec(String id, String name, String arguments) {
    }
}
