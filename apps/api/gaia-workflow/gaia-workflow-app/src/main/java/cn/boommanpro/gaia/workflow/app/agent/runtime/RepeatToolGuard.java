package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode;

import java.util.HashMap;
import java.util.Map;

/**
 * 同参数重复调用护栏（对齐 dsh repeat-tool-reminder，含本轮实测补强）。
 *
 * <p>判定键 = 工具名 + 规范化参数（键排序后序列化）。任何一次不同参数的调用
 * 都会重置链（换参 = 模型在尝试新策略）；同一键连续出现时按阶梯升级：</p>
 *
 * <ul>
 *   <li><b>第 2 次</b>：结果上附加温和提醒（不覆盖原结果——violations 里的
 *       path/fix 才是模型自修复的依据，覆盖它等于蒙住模型的眼睛）；</li>
 *   <li><b>第 3 次且仍 INVALID_ARGS</b>：硬熔断——2026-10-10 实测本地 Qwen 对
 *       同一 INVALID_ARGS 同参复读 8~67 次且完全无视提醒文本，advisory 挡不住，
 *       必须终止本轮。返回 STOP 信号由引擎收尾（合成收尾消息 + 事件广播）；</li>
 *   <li><b>3/5/8 次（非 INVALID_ARGS）</b>：附加详细升级提醒（dsh 同款文案）。</li>
 * </ul>
 *
 * <h3>同目标连发 streak（v3，2026-10-24 会话 80bec2df 两轮误杀后重做）</h3>
 *
 * <p>旧版按「工具名」计 streak：逐类查契约（get ×7，nodeType 各不相同）、逐节点
 * 配置（node ×6，nodeId 各不相同）这类正常批量作业被当成空转硬熔断。v3 语义：</p>
 *
 * <ul>
 *   <li><b>目标实体感知</b>：从参数提取 nodeId / nodeType / target / from+to /
 *       items[0].id / type / name / url / query 作为目标；只有「同工具 + 同目标」
 *       连发才计 streak。todo_write（steps 全量重写）等无目标工具 entity 为空，
 *       连发仍计入——2026-10-11 的变参循环实证保护不回退；</li>
 *   <li><b>模型轮边界感知</b>：引擎在每个 MODEL_CALL_END 调 {@link #onModelTurn()}；
 *       只有跨过边界的同目标调用才累计 streak。同一轮并行发出的批量是模型一次
 *       决策的产物，模型没看到任何结果，不存在「看到结果仍复读」的行为学意义；</li>
 *   <li><b>成功连发不硬停</b>：每次成功都真实改了状态，误杀代价（终止正常长任务）
 *       高于漏杀代价（token 空转到轮次护栏兜底）。成功 streak 只提醒；失败 streak
 *       第 4 次提醒、第 6 次硬熔断（微变参反复失败 = 真空转）。</li>
 * </ul>
 */
public class RepeatToolGuard {

    /** 非 INVALID_ARGS 复读的提醒阶梯（dsh 同款 3/5/8） */
    private static final int[] REMINDER_AT = {3, 5, 8};

    /** INVALID_ARGS 同参数硬熔断阈值 */
    public static final int INVALID_ARGS_HARD_STOP_AT = 3;

    /** 护栏动作：附加提醒 / 硬熔断 */
    public enum Action { NONE, APPEND, STOP }

    /** 一次登记的裁决结果 */
    public static class Verdict {
        public final Action action;
        public final String message;

        private Verdict(Action action, String message) {
            this.action = action;
            this.message = message;
        }

        static Verdict none() {
            return new Verdict(Action.NONE, null);
        }
    }

    /** 失败复读计数：同参数组合的累计失败次数（只有同 key 成功才清零） */
    private final Map<String, Integer> failCounts = new HashMap<>();

    /** 成功复读计数：同参数组合的连续成功次数（检测语法成功但语义空转） */
    private final Map<String, Integer> successCounts = new HashMap<>();

    /** 同目标连发提醒阈值（跨模型轮） */
    private static final int SAME_ENTITY_STREAK_REMIND_AT = 4;

    /** 同目标连发失败硬熔断阈值（成功连发不硬停：只提醒，轮次护栏兜底） */
    private static final int SAME_ENTITY_STREAK_HARD_STOP_AT = 6;

    private String lastToolName;
    private String lastEntity = "";
    private int sameEntityStreak;

    /**
     * 模型轮边界标记：由引擎在 MODEL_CALL_END 调用。
     * 边界之后的首次同目标调用才计入 streak；同轮并行批量不累计。
     * 初始为 true 保证首个调用计入。
     */
    private boolean boundarySinceLastCall = true;

    /**
     * 同工具独占重复轮：一个模型轮内只用了同一种（不改状态的）工具，且这一轮读到的 key
     * 全部是前面已经读过的——没有任何新信息。2026-10-24 第四轮实证：模型每轮并行重读
     * 全部 18 个节点、40 轮 475 次 get 不写不动——轮内每个 key 各异、周期 18，单键 / 同目标 /
     * 周期≤6 的检测全部不可见。只看「整轮纯读」会误杀「每轮读一个新节点类型契约」的
     * 标准节奏（2026-10-24 第九轮实证 6 次调用即被硬停），所以必须以「无新 key」为准。
     * 连续 2 个重复轮起提醒，4 个重复轮硬停；读到新内容、混入别的工具或纯正文轮即重置。
     */
    private static final int SOLO_REPEAT_TURNS_REMIND_AT = 2;
    private static final int SOLO_REPEAT_TURNS_STOP_AT = 4;
    /**
     * 只对「不改变工作流状态」的工具生效：整轮只 get / skill / todo_write 连续多轮 = 没有进展；
     * node / edge / test_case / run 整轮独占多轮可能是正常逐步施工或逐例验证（不同目标），
     * 它们的空转由同目标 streak 与序列循环检测负责。
     */
    private static final java.util.Set<String> SOLO_GUARDED_TOOLS = java.util.Set.of("get", "skill", "todo_write");
    private final java.util.Set<String> currentTurnTools = new java.util.HashSet<>();
    private final java.util.Set<String> currentTurnKeys = new java.util.HashSet<>();
    private final java.util.Set<String> soloSeenKeys = new java.util.HashSet<>();
    private String soloToolName;
    private int soloRepeatTurns;
    private boolean soloWarnedThisTurn;

    /** 登记一个模型轮边界（MODEL_CALL_END）：结算上一轮的工具构成，之后的同目标调用才计入 streak */
    public void onModelTurn() {
        String only = currentTurnTools.size() == 1 ? currentTurnTools.iterator().next() : null;
        if (only != null && SOLO_GUARDED_TOOLS.contains(only)) {
            if (only.equals(soloToolName) && soloSeenKeys.containsAll(currentTurnKeys)) {
                soloRepeatTurns++;
            } else {
                soloToolName = only;
                soloRepeatTurns = 0;
                soloSeenKeys.clear();
                soloSeenKeys.addAll(currentTurnKeys);
            }
        } else {
            soloToolName = null;
            soloRepeatTurns = 0;
            soloSeenKeys.clear();
        }
        currentTurnTools.clear();
        currentTurnKeys.clear();
        soloWarnedThisTurn = false;
        boundarySinceLastCall = true;
    }

    public Verdict record(String toolName, JSONObject args, boolean success, ToolErrorCode errorCode) {
        String key = toolName + "|" + canonicalArgs(args);
        recordKey(key);
        currentTurnTools.add(toolName);
        currentTurnKeys.add(key);
        // 已连续若干个「无新信息」的独占轮，本轮又是它：警告 / 硬停（只看已结算的前序轮）
        boolean soloGuarded = SOLO_GUARDED_TOOLS.contains(toolName) && toolName.equals(soloToolName);
        boolean soloStop = soloGuarded && soloRepeatTurns >= SOLO_REPEAT_TURNS_STOP_AT;
        boolean soloWarn = soloGuarded && soloRepeatTurns >= SOLO_REPEAT_TURNS_REMIND_AT && !soloWarnedThisTurn;
        // 同目标 streak：工具名 + 目标实体都相同才累计，且只在跨模型轮边界时递增
        String entity = entityOf(args);
        boolean streakTriggered = false;
        boolean streakHardStop = false;
        if (toolName.equals(lastToolName) && entity.equals(lastEntity)) {
            if (boundarySinceLastCall) {
                sameEntityStreak++;
            }
            if (sameEntityStreak == SAME_ENTITY_STREAK_REMIND_AT) {
                streakTriggered = true;
            }
            if (sameEntityStreak >= SAME_ENTITY_STREAK_HARD_STOP_AT) {
                streakHardStop = true;
            }
        } else {
            lastToolName = toolName;
            lastEntity = entity;
            sameEntityStreak = 1;
        }
        boundarySinceLastCall = false;

        if (success) {
            // 成功不再无条件打破重复链（2026-10-11 实证：模型同参 edit 成功 8 次——
            // 语法成功不等于语义进展，连环空转由 alternating-loop 检测兜住）。
            // 成功计数独立起算（前序失败链不并入成功复读的次数）。
            int count;
            if (key.equals(lastKey) && lastWasSuccess) {
                count = successCounts.getOrDefault(key, 0) + 1;
            } else {
                count = 1;
            }
            successCounts.put(key, count);
            failCounts.remove(key); // 该参数组合已成功：失败链清零
            lastKey = key;
            lastWasSuccess = true;
            // 被警告后仍原样重复整组序列：硬停优先于一切提醒（成功连发本身不硬停，但循环复读例外）
            if (pendingCycle == Action.STOP) {
                return consumeCycleVerdict();
            }
            if (soloStop) {
                return new Verdict(Action.STOP, soloStopMessage(toolName));
            }
            if (count >= SUCCESS_REPEAT_REMIND_AT) {
                return new Verdict(Action.APPEND, "你已连续第 " + count + " 次用完全相同的参数成功调用 "
                    + toolName + "，结果不会有任何变化。请先 get(target=canvas) / get(target=variables) 核实现状，"
                    + "换一种修改或直接向用户说明。");
            }
            // 同目标成功连发只提醒不熔断（2026-10-24 误杀实证：逐节点配置/逐类查契约
            // 是正常批量作业，每次成功都推进了状态；空转兜底交给同参复读/交替循环/轮次护栏）
            if (streakHardStop || streakTriggered) {
                String target = entity.isEmpty() ? "同一组参数形态" : "同一目标 " + entity;
                return new Verdict(Action.APPEND,
                    "你已连续 " + sameEntityStreak + " 次成功调用 " + toolName + "（" + target
                        + "）。如果这个目标已经达成，核对一次结果后转向下一步；"
                        + "批量操作请一次写全（node 用 items、todo_write 全量重写），不要逐条微调。");
            }
            if (soloWarn) {
                soloWarnedThisTurn = true;
                return new Verdict(Action.APPEND, soloWarnMessage(toolName));
            }
            if (pendingCycle != null) {
                return consumeCycleVerdict();
            }
            return Verdict.none();
        }
        // 失败计数不再被「中间夹的其他调用」重置（2026-10-11 三轮实证：write 失败 →
        // edit/read 失败 → write 同参复读，复读链被 edit/read 清零，第 2/3 次阶梯提醒
        // 全部失位）。同 key 失败累计，只有该 key 成功才清零。
        lastKey = key;
        lastWasSuccess = false;
        int count = failCounts.getOrDefault(key, 0) + 1;
        failCounts.put(key, count);

        boolean invalidArgs = errorCode == ToolErrorCode.INVALID_ARGS;
        if (pendingCycle == Action.STOP) {
            return consumeCycleVerdict();
        }
        if (soloStop) {
            return new Verdict(Action.STOP, soloStopMessage(toolName));
        }
        if (streakHardStop) {
            return new Verdict(Action.STOP,
                "⚠️ 系统护栏：你已连续 " + sameEntityStreak + " 次调用 " + toolName
                    + "（同一目标，参数反复微调）且一直失败，本轮执行已被终止以避免空转。\n\n"
                    + "已生效的改动保持有效。继续推进请换一种方式：先用 get(target=canvas) / get(target=variables) "
                    + "核对现状，或把回执里的可抄示例逐字段比对后一次性修正重发；"
                    + "若仍无法修正，直接说明你需要用户提供什么。");
        }
        if (invalidArgs && count >= INVALID_ARGS_HARD_STOP_AT) {
            return new Verdict(Action.STOP, hardStopMessage(toolName, count));
        }
        if (invalidArgs && count == 2) {
            return new Verdict(Action.APPEND,
                "你已第 2 次用完全相同的参数调用 " + toolName + " 并得到同样的 INVALID_ARGS。"
                    + "同样的输入只会得到同样的输出：请先读懂 error.violations 里每一项的 fix，"
                    + "改完参数再调用；改不动就用 get(target=canvas) 查看现状，或直接向用户提问。");
        }
        if (!invalidArgs) {
            for (int threshold : REMINDER_AT) {
                if (count == threshold) {
                    return new Verdict(Action.APPEND, reminder(toolName, count));
                }
            }
        }
        // 同目标失败 streak 第 4 次先提醒（预告熔断线）：微变参换 key 抓不住阶梯，
        // 不能让模型毫无预警地撞上第 6 次硬停
        if (streakTriggered) {
            String target = entity.isEmpty() ? "同一组参数形态" : "同一目标 " + entity;
            return new Verdict(Action.APPEND,
                "你已连续 " + sameEntityStreak + " 次对" + target + "调用 " + toolName + " 且都没有成功"
                    + "（参数反复微调）。同样的思路只会得到同样的失败：先用 get(target=canvas) / "
                    + "get(target=variables) 核对现状，换一种参数写法或换一个做法；"
                    + "再连续失败 " + (SAME_ENTITY_STREAK_HARD_STOP_AT - sameEntityStreak) + " 次将终止本轮。");
        }
        if (soloWarn) {
            soloWarnedThisTurn = true;
            return new Verdict(Action.APPEND, soloWarnMessage(toolName));
        }
        if (pendingCycle != null) {
            return consumeCycleVerdict();
        }
        return Verdict.none();
    }

    /** 同工具独占重复轮的提醒：读/查不会改变现状，点明该转去做什么 */
    private String soloWarnMessage(String toolName) {
        return "你已连续 " + (soloRepeatTurns + 1) + " 轮只调用 " + toolName + "，而且读的全是之前已经读过的内容，没有任何新信息。"
            + ("get".equals(toolName)
                ? "现状已经读够了——读取不会改变画布。立即按你的计划动手：node(action=add/update/remove) / "
                  + "edge(action=connect) 修改结构，或 test_case / run 验证；"
                : "重复同一种操作不会推进任务。请转向下一步：修改节点（node / edge）、沉淀用例（test_case）或向用户汇报；")
            + "再连续 " + (SOLO_REPEAT_TURNS_STOP_AT - soloRepeatTurns) + " 轮这样重复，本轮将被终止。";
    }

    /** 同工具独占重复轮的硬停收尾文案 */
    private String soloStopMessage(String toolName) {
        return "⚠️ 系统护栏：你已连续 " + (soloRepeatTurns + 1) + " 轮只调用 " + toolName
            + " 重复读取同样的内容而没有任何其他操作，本轮执行已被终止以避免空转。\n\n"
            + "已生效的改动保持有效。下一轮请直接执行计划里的第一步实际操作"
            + "（node / edge 改结构，test_case / run 验证），不要再整轮重复读取或重复运行；"
            + "若不知道该做什么，直接向用户说明当前状态并提问。";
    }

    /**
     * 从参数提取「目标实体」标识：同工具对不同目标的连发是批量作业（不算 streak），
     * 同工具对同一目标的连发才可能是空转。提取顺序按各工具 schema 的标识字段：
     * edge 的 from+port+to → nodeId → nodeType → target → items[0].id/type → type →
     * name → url → query；都不命中返回空串（todo_write 全量重写等，连发计入 streak）。
     */
    static String entityOf(JSONObject args) {
        if (args == null) {
            return "";
        }
        try {
            // edge：连线身份 = from + fromPort + to（同源不同目标是不同连线）
            if (args.containsKey("from") || args.containsKey("to")) {
                return args.getStr("from", "") + ">" + args.getStr("fromPort", "")
                    + ">" + args.getStr("to", "");
            }
            // get / node(update,remove) / run(node,tests) / test_case(节点级)
            String nodeId = args.getStr("nodeId");
            if (nodeId != null && !nodeId.isEmpty()) {
                return "nodeId=" + nodeId;
            }
            // get(target=knowledge, nodeType)
            String nodeType = args.getStr("nodeType");
            if (nodeType != null && !nodeType.isEmpty()) {
                return "nodeType=" + nodeType;
            }
            // get(target=canvas) / run(target=workflow|tests)
            String target = args.getStr("target");
            if (target != null && !target.isEmpty()) {
                return "target=" + target;
            }
            // node(action=add, items=[...])：批量目标取首条显式 id，缺省（自动生成 id）退化为类型
            JSONArray items = args.getJSONArray("items");
            if (items != null && !items.isEmpty()) {
                JSONObject first = items.getJSONObject(0);
                if (first != null) {
                    String id = first.getStr("id");
                    if (id != null && !id.isEmpty()) {
                        return "items[0].id=" + id;
                    }
                    String type = first.getStr("type");
                    if (type != null && !type.isEmpty()) {
                        return "items[0].type=" + type;
                    }
                }
            }
            // node(action=add) 单个
            String type = args.getStr("type");
            if (type != null && !type.isEmpty()) {
                return "type=" + type;
            }
            // skill / test_case(工作流级) / web_fetch / web_search
            for (String k : new String[]{"name", "url", "query"}) {
                String v = args.getStr(k);
                if (v != null && !v.isEmpty()) {
                    return k + "=" + v;
                }
            }
        } catch (Exception e) {
            // 参数形状异常（schema 会在管线前拦住）：退化为空实体，宁可保守计数
        }
        return "";
    }

    /**
     * 记录调用序列并识别「同一组调用序列原样重复」的循环（周期 2..6）。
     * 周期 2 即 2026-10-11 实证的 edit→run 交替空转；周期 5 是 2026-10-24 实证的
     * run(workflow)×2 → test_case×2 → run(tests) 五步循环（每步参数都与上一轮完全相同，
     * 单键计数与同目标 streak 都抓不住，只有序列模式能识别）。
     *
     * <p>末尾 2p 个 key 前后两半相同且块内不止一种 key（单键复读交给键计数）即命中。
     * 命中后冷却一个周期再评估：同一循环再次完整重复（已警告仍不改）→ 升级为硬停；
     * 换了循环内容则重新从警告开始。</p>
     */
    private void recordKey(String key) {
        calls++;
        recentKeys.addLast(key);
        while (recentKeys.size() > CYCLE_WINDOW) {
            recentKeys.removeFirst();
        }
        if (calls < cycleCooldownUntil || pendingCycle != null) {
            return;
        }
        String[] arr = recentKeys.toArray(new String[0]);
        int n = arr.length;
        for (int p = 2; p <= CYCLE_MAX_PERIOD; p++) {
            if (n < 2 * p) {
                break;
            }
            boolean repeated = true;
            java.util.Set<String> distinct = new java.util.HashSet<>();
            for (int i = 0; i < p; i++) {
                String a = arr[n - 2 * p + i];
                String b = arr[n - p + i];
                if (!a.equals(b)) {
                    repeated = false;
                    break;
                }
                distinct.add(b);
            }
            if (!repeated || distinct.size() < 2) {
                continue;
            }
            // 旋转不敏感的循环签名：同一组调用无论从哪一步截断都算同一个循环
            String signature = distinct.stream().sorted().collect(java.util.stream.Collectors.joining("\u0001"));
            if (signature.equals(lastCycleSignature)) {
                cycleRepeats++;
            } else {
                lastCycleSignature = signature;
                cycleRepeats = 1;
            }
            StringBuilder steps = new StringBuilder();
            for (int i = 0; i < p; i++) {
                if (i > 0) {
                    steps.append(" → ");
                }
                steps.append(toolNameOf(arr[n - p + i]));
            }
            pendingCyclePeriod = p;
            pendingCycleSteps = steps.toString();
            pendingCycle = cycleRepeats >= 2 ? Action.STOP : Action.APPEND;
            cycleCooldownUntil = calls + p;
            return;
        }
    }

    /** 取出待发的循环裁决（APPEND 警告 / STOP 硬停），取出即清空 */
    private Verdict consumeCycleVerdict() {
        if (pendingCycle == null) {
            return null;
        }
        Action action = pendingCycle;
        int period = pendingCyclePeriod;
        String steps = pendingCycleSteps;
        pendingCycle = null;
        if (action == Action.STOP) {
            return new Verdict(Action.STOP,
                "⚠️ 系统护栏：你在已被提醒后仍第 " + cycleRepeats + " 次原样重复同一组工具调用序列（周期 "
                    + period + "：" + steps + "），每一步参数与上一轮完全相同、结果不会有任何变化，"
                    + "本轮执行已被终止以避免空转。\n\n已生效的改动保持有效。继续推进请换一种做法："
                    + "按最近一次结果里的 failReason / error / failedNodes 定位到具体节点或字段去修，"
                    + "或 get(target=canvas) 核对现状；若无法修正，直接说明你需要用户提供什么。");
        }
        return new Verdict(Action.APPEND, ALTERNATING_LOOP_MESSAGE
            + "（本次识别到的循环：周期 " + period + "，" + steps + "）");
    }

    private static String toolNameOf(String key) {
        int bar = key.indexOf('|');
        return bar > 0 ? key.substring(0, bar) : key;
    }

    /** 循环检测窗口与最大周期 */
    private static final int CYCLE_WINDOW = 16;
    private static final int CYCLE_MAX_PERIOD = 6;

    private int calls;
    private int cycleCooldownUntil;
    private String lastCycleSignature;
    private int cycleRepeats;
    private Action pendingCycle;
    private int pendingCyclePeriod;
    private String pendingCycleSteps;

    /** 最近调用 key 序列（含成功调用），循环检测用 */
    private final java.util.ArrayDeque<String> recentKeys = new java.util.ArrayDeque<>();

    /** 同参数成功复读的提醒阈值 */
    private static final int SUCCESS_REPEAT_REMIND_AT = 3;

    /** 序列循环提醒文案（周期 2 的「修改→运行」交替是最常见形态） */
    public static final String ALTERNATING_LOOP_MESSAGE =
        "循环警报：你在原样重复同一组工具调用序列（如「修改→运行」交替）且每一步参数都没有变化，"
            + "结果也不会变化，继续这样调用不会有进展。"
            + "请停下来：按最近一次结果里的 failReason / error / warnings 定位真正没生效的节点或字段，只修那一处；"
            + "或 get(target=canvas) 查看当前结构换一种做法；或直接向用户说明困难。";

    /** 非参数错误复读的升级提醒（dsh 同款文案结构） */
    private static String reminder(String toolName, int count) {
        return "复读警报：你已用完全相同的参数第 " + count + " 次调用 " + toolName
            + "，且没有得到期望的结果。这些调用没有产生任何进展。"
            + "请仔细检查最近一次结果，换一种行动：修改参数、改用其他工具，"
            + "或直接用正文向用户说明遇到的困难。不要再用这组参数调用。";
    }

    /** INVALID_ARGS 硬熔断收尾文案（会作为本轮结束的助手消息落库） */
    private static String hardStopMessage(String toolName, int count) {
        return "⚠️ 系统护栏：你已连续 " + count + " 次用完全相同的参数调用 " + toolName
            + " 并得到 INVALID_ARGS，本轮执行已被终止以避免空转。\n\n"
            + "已生效的改动保持有效（成功的工具调用不会回滚）。继续推进请换一种方式："
            + "先用 get(target=canvas / variables / knowledge) 核对现状，"
            + "按最近一次 error.violations 的 fix 逐项修正参数后重试；"
            + "若仍无法修正，直接说明你需要用户提供什么。";
    }

    /** 参数规范化：键排序后序列化，保证等价参数产生同一 key */
    private static String canonicalArgs(JSONObject args) {
        if (args == null || args.isEmpty()) {
            return "{}";
        }
        try {
            return JSONUtil.toJsonStr(sortKeys(args));
        } catch (Exception e) {
            return String.valueOf(args);
        }
    }

    private static JSONObject sortKeys(JSONObject obj) {
        JSONObject sorted = new JSONObject(true);
        obj.keySet().stream().sorted().forEach(k -> sorted.set(k, obj.get(k)));
        return sorted;
    }

    private String lastKey;

    /** 上一次调用是否成功（成功/失败复读链分开计数） */
    private boolean lastWasSuccess;
}
