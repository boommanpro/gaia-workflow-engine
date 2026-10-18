package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.boommanpro.gaia.workflow.app.agent.session.AskUserPendingStore;
import cn.boommanpro.gaia.workflow.app.agent.session.AskUserRoundOrchestrator;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolGroup;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * ask_user —— 向用户提问并等待回答（对标 dsh/OWB 的 ask 工具，取代 ::options 文本协议）。
 *
 * <p>需要用户选择或补充信息时调用：提问以交互卡片展示（问题 + 选项按钮 + 自由输入）。
 * 用户作答或超时后，答案作为<b>新一轮对话</b>继续（见 {@link AskUserRoundOrchestrator}）：</p>
 * <ul>
 *   <li>用户点选/输入：答案成为用户消息，当前 run 停止、以答案启动新 run</li>
 *   <li>超时未答：自动替用户选择 recommended 选项（无 recommended 则第一个），
 *       同样以新一轮对话继续；无选项时返回「未回应」提示由模型按已有信息收尾</li>
 * </ul>
 *
 * <p>等待上限：全局默认 {@code agent.ask-user.timeout-seconds}（默认 60 秒，后台可配），
 * 每次调用可用参数 {@code timeoutSeconds} 覆盖（钳制 5~300 秒）。</p>
 */
@Slf4j
@Component
public class AskUserToolExecutor implements ToolExecutor {

    /** 全局默认等待上限（秒）；后台配置 agent.ask-user.timeout-seconds */
    @Value("${agent.ask-user.timeout-seconds:60}")
    private long defaultTimeoutSeconds = 60;

    /** 单次调用参数 timeoutSeconds 的钳制范围（秒） */
    private static final long MIN_CALL_TIMEOUT_SECONDS = 5;
    private static final long MAX_CALL_TIMEOUT_SECONDS = 300;
    /** 全局配置的钳制范围（秒） */
    private static final long MAX_GLOBAL_TIMEOUT_SECONDS = 3600;

    private final AskUserPendingStore pendingStore;
    private final AskUserRoundOrchestrator roundOrchestrator;

    public AskUserToolExecutor(AskUserPendingStore pendingStore,
                               AskUserRoundOrchestrator roundOrchestrator) {
        this.pendingStore = pendingStore;
        this.roundOrchestrator = roundOrchestrator;
    }

    @Override
    public ToolGroup group() {
        return ToolGroup.COMMON;
    }

    @Override
    public String name() {
        return "ask_user";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "向用户提问并等待回答（答案成为新一轮对话；需要用户选择/确认/补充信息时用；不要在正文里输出选项文本）";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String question = args.getStr("question");
        if (question == null || question.trim().isEmpty()) {
            return ToolResult.fail("{\"error\":{\"code\":\"INVALID_ARGS\",\"violations\":[{\"path\":\"question\",\"fix\":\"question 必填，一句话说清要用户决定什么\"}]}}",
                "question 不能为空", cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode.INVALID_ARGS);
        }
        JSONArray rawOptions = args.getJSONArray("options");
        if (rawOptions != null && rawOptions.size() > 5) {
            return ToolResult.fail("{\"error\":{\"code\":\"INVALID_ARGS\",\"violations\":[{\"path\":\"options\",\"fix\":\"选项最多 5 个；更多选择说明问题该拆解了\"}]}}",
                "options 最多 5 个", cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode.INVALID_ARGS);
        }
        long timeoutSeconds = resolveTimeoutSeconds(args);

        String sessionKey = context.getSessionKey();
        String askId = "ask-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        AskUserPendingStore.PendingAsk ask = pendingStore.create(sessionKey, askId);

        JSONArray options = normalizeOptions(rawOptions);
        JSONObject event = new JSONObject()
            .set("askId", askId)
            .set("question", question.trim());
        if (!options.isEmpty()) {
            event.set("options", options);
        }
        try {
            context.getSink().emit(AgentEvent.of("ask_request", event));
        } catch (Exception e) {
            pendingStore.drop(askId);
            log.debug("[ask-user] event emit failed: {}", e.getMessage());
        }

        try {
            String answer = ask.answer.get(timeoutSeconds, TimeUnit.SECONDS);
            // 用户已作答：新一轮对话由答案端点编排（resolve → 停旧 run → 新 run），
            // 这里把答案带回存档即可 —— 旧 run 随即被停止，不再继续推理
            return ToolResult.ok(new JSONObject()
                .set("askId", askId)
                .set("answer", answer)
                .toString(), "用户已作答（答案已成为新一轮对话）");
        } catch (java.util.concurrent.TimeoutException e) {
            String auto = pickAutoAnswer(options);
            if (auto == null) {
                // 无选项可代答：按「未回应」返回，模型基于已有信息收尾
                pendingStore.drop(askId);
                String reason = "用户未在 " + timeoutSeconds + " 秒内回应。请基于已有信息继续推进，把未确认的点在结语中列出来，不要重复追问。";
                return ToolResult.ok(new JSONObject()
                    .set("askId", askId)
                    .set("timeout", true)
                    .set("answer", reason)
                    .toString(), reason);
            }
            // 超时自动代答：recommended 优先（pickAutoAnswer 已裁定），同样走新一轮对话。
            // 登记的摘除交给编排器的 resolve —— 先 drop 会让 resolve 扑空、新轮编排静默失败，
            // 旧 run 就会带着代答结果原地继续（实测踩过的坑）。
            // awaitRunExit=false：本线程就是 run 的工具线程，等旧 run 退出会自锁
            boolean started = roundOrchestrator.startRound(sessionKey, askId, auto, true, false);
            if (!started) {
                // 代答被拒（连续自动代答达上限，防「追问→超时→自答→再追问」自驱循环）：
                // 按「未回应」收尾，登记就地摘除
                pendingStore.drop(askId);
                String reason = "用户未在 " + timeoutSeconds + " 秒内回应，且连续自动代答已达上限，不再替用户选择。"
                    + "请基于已有信息收尾并把待确认项列出来，等用户回来再继续。";
                return ToolResult.ok(new JSONObject()
                    .set("askId", askId)
                    .set("timeout", true)
                    .set("answer", reason)
                    .toString(), reason);
            }
            return ToolResult.ok(new JSONObject()
                .set("askId", askId)
                .set("timeout", true)
                .set("auto", true)
                .set("answer", auto)
                .toString(), "超时未答，已自动替用户选择：" + auto);
        } catch (Exception e) {
            pendingStore.drop(askId);
            String reason = "提问等待被中断（运行已停止）。";
            return ToolResult.ok(new JSONObject()
                .set("askId", askId)
                .set("timeout", true)
                .set("answer", reason)
                .toString(), reason);
        }
    }

    /**
     * 等待上限解析：调用参数 timeoutSeconds 优先（钳制 5~300 秒），
     * 否则用全局配置（钳制 5~3600 秒，默认 60 秒）。
     */
    private long resolveTimeoutSeconds(JSONObject args) {
        Long requested = args.getLong("timeoutSeconds", 0L);
        if (requested != null && requested > 0) {
            return Math.max(MIN_CALL_TIMEOUT_SECONDS, Math.min(MAX_CALL_TIMEOUT_SECONDS, requested));
        }
        return Math.max(MIN_CALL_TIMEOUT_SECONDS,
            Math.min(MAX_GLOBAL_TIMEOUT_SECONDS, defaultTimeoutSeconds));
    }

    /**
     * 选项归一化为 {@code [{label, detail?, recommended?}]} 规范形态。
     * schema 要求模型传对象数组，但历史/异构调用可能是纯字符串 ——
     * 事件载荷统一走这里，前端不必（也不能）把原始条目直接当文本渲染。
     * recommended 只在为 true 时保留（稀疏标记，超时自动代答据此选择）。
     */
    private static JSONArray normalizeOptions(JSONArray options) {
        JSONArray out = new JSONArray();
        if (options == null) {
            return out;
        }
        for (Object item : options) {
            if (item instanceof String) {
                String label = ((String) item).trim();
                if (!label.isEmpty()) {
                    out.add(new JSONObject().set("label", label));
                }
            } else if (item instanceof JSONObject) {
                JSONObject obj = (JSONObject) item;
                String label = obj.getStr("label") == null ? "" : obj.getStr("label").trim();
                if (label.isEmpty()) {
                    continue;
                }
                JSONObject normalized = new JSONObject().set("label", label);
                String detail = obj.getStr("detail") == null ? "" : obj.getStr("detail").trim();
                if (!detail.isEmpty()) {
                    normalized.set("detail", detail);
                }
                if (obj.getBool("recommended", false)) {
                    normalized.set("recommended", true);
                }
                out.add(normalized);
            }
        }
        return out;
    }

    /** 超时自动代答的裁定：recommended 优先，无 recommended 取第一个；无选项返回 null */
    private static String pickAutoAnswer(JSONArray normalized) {
        if (normalized == null || normalized.isEmpty()) {
            return null;
        }
        String first = null;
        for (Object item : normalized) {
            if (!(item instanceof JSONObject)) {
                continue;
            }
            JSONObject option = (JSONObject) item;
            String label = option.getStr("label");
            if (label == null || label.isEmpty()) {
                continue;
            }
            if (first == null) {
                first = label;
            }
            if (option.getBool("recommended", false)) {
                return label;
            }
        }
        return first;
    }
}
