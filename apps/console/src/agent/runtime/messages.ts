/**
 * 消息构建纯函数 —— 历史行（DB AgentMessage）与临时行（live 占位 / ask 卡 / 产物卡）
 * 到展示行（DisplayMessage）的全部换算。从 AgentContext 拆出：reducer 与历史加载共用，
 * 可独立单测（旧 session-merge.test 的钉子全部保留）。
 */
import type {
  AgentArtifactDto,
  AgentMessage,
  AskCardData,
  AskOption,
  DisplayMessage,
  PlanStep,
  TimelineItem,
  ToolCallEvent,
} from '../types';

/** 持久化时间线条目 → 前端 TimelineItem（与 applySnapshot 同一映射口径；历史条目一律视为已收尾） */
export function mapPersistedTimeline(
  entries: NonNullable<AgentMessage['timeline']> | null | undefined
): TimelineItem[] {
  const raw: Array<{
    kind?: string;
    id?: string;
    text?: string;
    source?: string;
    call?: { id?: string; name?: string; args?: any; result?: string };
  }> = typeof entries === 'string'
    ? (() => { try { const parsed = JSON.parse(entries); return Array.isArray(parsed) ? parsed : []; } catch { return []; } })()
    : (entries || []);
  const out: TimelineItem[] = [];
  for (const item of raw) {
    if (!item || !item.kind) continue;
    if (item.kind === 'tool') {
      out.push({
        kind: 'tool',
        id: item.id || item.call?.id || `tl-tool-${out.length}`,
        call: {
          id: item.call?.id || item.id || '',
          action: item.call?.name || 'unknown',
          args: item.call?.args ?? {},
          ...(item.call?.result ? { result: String(item.call.result) } : {}),
        },
      });
    } else if (item.kind === 'notice') {
      out.push({ kind: 'notice', id: item.id || `tl-notice-${out.length}`, text: item.text || '', source: item.source });
    } else if (item.kind === 'text' || item.kind === 'thinking') {
      out.push({ kind: item.kind, id: item.id || `tl-${item.kind}-${out.length}`, text: item.text || '', closed: true });
    }
  }
  return out;
}

/**
 * 历史重建的 todo 步骤状态归一：词表对齐后端 TodoWriteToolExecutor.mapStatus
 * （落库的 tool args 是模型原始词表：completed/in_progress/pending…）。
 * 区别：历史 run 已结束，「进行中」不保留（落为 pending），
 * 避免刷新后任务清单里残留永远旋转的"进行中"步骤。
 */
function mapRestoredTodoStatus(raw: unknown): PlanStep['status'] {
  switch (String(raw ?? '').trim().toLowerCase()) {
    case 'completed':
    case 'done':
    case 'finished':
      return 'done';
    case 'blocked':
    case 'error':
    case 'failed':
      return 'error';
    default:
      return 'pending';
  }
}

export function convertMessages(msgs: AgentMessage[]): DisplayMessage[] {
  // 先建立 tool_call_id → tool 结果 content 映射，用于回填工具步骤结果
  const toolResultMap = new Map<string, string>();
  for (const msg of msgs) {
    if (msg.role === 'tool' && msg.toolCallId) {
      toolResultMap.set(msg.toolCallId, msg.content || '');
    }
  }

  interface AskCall {
    askId: string;
    question: string;
    options?: AskOption[];
    answer?: string;
    auto?: boolean;
    answeredOnlyByTimeout?: boolean;
  }

  interface RunGroup {
    firstId: string;
    ts: number;
    contents: string[];
    thinkings: string[];
    steps: ToolCallEvent[];
    /** 真实调用链路的交错时间线（思考 → 工具 → 思考 → … → 正文） */
    timeline: TimelineItem[];
    /** 本 run 里的 ask_user 调用（flush 时紧跟本组重建为已答提问卡，持久可见） */
    asks: AskCall[];
  }
  const result: DisplayMessage[] = [];
  let group: RunGroup | null = null;

  /** 从 ask_user 的落库 toolCalls + 结果行重建提问卡数据（历史视图的提问卡数据源） */
  const rebuildAsk = (callId: string, args: any, rawResult?: string): AskCall | null => {
    const question = String(args?.question || '');
    if (!question) return null;
    let answer: string | undefined;
    let auto = false;
    let answeredOnlyByTimeout = false;
    if (rawResult) {
      try {
        const parsed = JSON.parse(rawResult);
        answer = parsed.answer != null ? String(parsed.answer) : undefined;
        auto = parsed.auto === true;
        answeredOnlyByTimeout = parsed.timeout === true && parsed.auto !== true;
      } catch { /* 结果不是 JSON：当无答案处理 */ }
    }
    return {
      askId: callId,
      question,
      options: Array.isArray(args?.options) ? args.options : undefined,
      answer,
      auto,
      answeredOnlyByTimeout,
    };
  };

  const flush = () => {
    if (!group) return;
    const g = group;
    group = null;
    const content = g.contents.filter(Boolean).join('\n\n');
    const thinking = g.thinkings.filter(Boolean).join('\n\n');
    if (!content && !thinking && g.steps.length === 0 && g.asks.length === 0) return;

    let planSteps: DisplayMessage['planSteps'];
    // run 内模型会多次 todo_write 勾进度，取最后一次 = 最终状态（与 live plan 事件的 upsert 语义一致）
    let planStep: ToolCallEvent | undefined;
    for (const s of g.steps) {
      if (s.action === 'todo_write' || s.action === 'createPlan') planStep = s;
    }
    if (planStep && Array.isArray((planStep.args as any)?.steps)) {
      planSteps = ((planStep.args as any).steps as any[]).map((s: any, idx: number) => ({
        id: `plan-restored-${planStep.id}-${idx}`,
        // 落库的是模型原始参数（steps[].content 为标题）；后端只在实时广播前归一化成
        // intent —— 历史重建两条字段都要认，否则刷新后退化为「Step N」占位
        intent: s.intent || s.description || s.content || `Step ${idx + 1}`,
        action: s.action || 'todo',
        args: s.args || {},
        status: mapRestoredTodoStatus(s.status),
      }));
    }

    result.push({
      id: `run-${g.firstId}`,
      role: 'assistant',
      content,
      ...(thinking ? { thinking } : {}),
      ...(g.steps.length ? { toolSteps: g.steps } : {}),
      ...(planSteps ? { planSteps } : {}),
      ...(g.timeline.length ? { timeline: g.timeline } : {}),
      timestamp: g.ts,
    });
    // 本组里的 ask_user 调用重建为已答提问卡：紧跟 AI 回复之后、用户作答气泡之前 ——
    // 提问卡即模型回复的一部分，刷新后不能凭空消失（答案气泡本身已是落库的 user 行）
    for (const ask of g.asks) {
      result.push({
        id: `ask-${ask.askId}`,
        role: 'assistant',
        content: '',
        timestamp: g.ts,
        ask: {
          askId: ask.askId,
          question: ask.question,
          options: ask.options,
          answered: true,
          answer: ask.answer ?? (ask.answeredOnlyByTimeout ? '超时未回应' : undefined),
          auto: ask.auto,
        },
      });
    }
  };

  for (const msg of msgs) {
    const ts = msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now();
    if (msg.role === 'user') {
      flush();
      let images: string[] | undefined;
      if (msg.images) {
        try {
          const parsed = JSON.parse(msg.images);
          if (Array.isArray(parsed)) images = parsed;
        } catch { /* ignore */ }
      }
      result.push({
        id: `msg-${msg.id}`,
        role: 'user',
        content: msg.content || '',
        images,
        timestamp: ts,
      });
      continue;
    }
    if (msg.role === 'assistant') {
      if (!group) group = { firstId: `msg-${msg.id}`, ts, contents: [], thinkings: [], steps: [], timeline: [], asks: [] };
      // 时间线按真实落库顺序推进：思考 → （正文若有）→ 工具调用 → …
      if (msg.thinking) {
        group.thinkings.push(msg.thinking);
        group.timeline.push({ kind: 'thinking', id: `thk-${msg.id}`, text: msg.thinking });
      }
      if (msg.content) {
        group.contents.push(msg.content);
        group.timeline.push({ kind: 'text', id: `txt-${msg.id}`, text: msg.content });
      }
      if (msg.toolCalls) {
        try {
          const tcs = JSON.parse(msg.toolCalls);
          for (const tc of tcs) {
            let args = {};
            try {
              args = JSON.parse(tc.function?.arguments || '{}');
            } catch { /* ignore */ }
            const toolResult = toolResultMap.get(tc.id);
            // ask_user 调用重建为持久提问卡（详见 flush）
            if (tc.function?.name === 'ask_user') {
              const ask = rebuildAsk(tc.id, args, toolResult);
              if (ask) group.asks.push(ask);
            }
            const step: ToolCallEvent = {
              id: tc.id,
              action: tc.function?.name || 'unknown',
              args,
              result: toolResult,
            };
            group.steps.push(step);
            group.timeline.push({ kind: 'tool', id: tc.id, call: step });
          }
        } catch { /* ignore */ }
      }
      // 行自带持久化时间线（run 收尾落库）时整组替换：它才是真实调用链路，
      // 上面按行重建的只是行粒度粗的兜底（思考/正文各合并成一块）
      const persisted = mapPersistedTimeline(msg.timeline);
      if (persisted.length > 0) {
        group.timeline = persisted;
      }
      continue;
    }
    if (msg.role === 'tool') {
      // 工具结果已按 toolCallId 回填进对应 run 的 toolSteps；
      // 只有孤儿结果（无 toolCallId）才单独成条
      if (!msg.toolCallId && msg.content) {
        flush();
        result.push({
          id: `msg-${msg.id}`,
          role: 'tool',
          content: msg.content,
          timestamp: ts,
        });
      }
      continue;
    }
  }
  flush();
  // 顺序容错（历史数据）：作答轮的落库顺序曾是「工具结果 → 答案用户行 → 中断 assistant 行」，
  // 重放时答案气泡会排在提问卡前面。若提问卡前一条是 AI 回复、再前一条恰好是等值的用户气泡，
  // 旋转为 [AI 回复][提问卡][答案气泡] —— 只做相邻结构匹配，不误伤正常对话
  for (let i = 2; i < result.length; i++) {
    const card = result[i];
    if (card.ask?.answered && card.ask.answer) {
      const bubble = result[i - 2];
      if (result[i - 1].role === 'assistant' && bubble.role === 'user' && bubble.content === card.ask.answer) {
        result[i - 2] = result[i - 1];
        result[i - 1] = card;
        result[i] = bubble;
      }
    }
  }
  return result;
}

/**
 * 幂等合并：把 live 占位行接回历史加载结果之后。
 * getMessages 与 SSE 快照并发返回时，整表替换会抹掉已建立的 live 占位行 ——
 * 一旦抹掉，liveMessageId 悬空，后续 token 只进 store 而没有任何行去渲染它，
 * 流式内容不可见直到 done 兜底重载。历史行落位前先摘出 live 行，落位后原样接回。
 */
export function appendLiveRow(
  history: DisplayMessage[],
  liveRow: DisplayMessage | null | undefined
): DisplayMessage[] {
  if (!liveRow) return history;
  const existing = history.findIndex((m) => m.id === liveRow.id);
  if (existing >= 0) {
    const next = [...history];
    next[existing] = liveRow;
    return next;
  }
  return [...history, liveRow];
}

/**
 * 历史整表替换时保留全部临时行（live 占位 + 未答的 ask 提问卡）。
 * ask 卡只存在于前端（ask_request 事件 / run_state 快照 pendingAsk 恢复），不落库 ——
 * 历史响应晚到时若不接回，挂起中的提问卡会被整表替换抹掉，用户从此无处作答。
 * 已作答的卡片不保留：答案已作为用户消息落库（新一轮对话），重载后由真实历史行呈现。
 */
export function appendEphemeralRows(
  history: DisplayMessage[],
  prev: DisplayMessage[],
  liveId: string | null | undefined
): DisplayMessage[] {
  const liveRow = liveId ? prev.find((m) => m.id === liveId) ?? null : null;
  let next = appendLiveRow(history, liveRow);
  for (const m of prev) {
    if (m.ask && !m.ask.answered && !next.some((n) => n.id === m.id)) {
      next = [...next, m];
    }
  }
  return next;
}

/** 用后端 plan 事件 upsert PlanCard 消息 */
export function upsertPlanCard(prev: DisplayMessage[], plan: { id: string; steps: any[] }): DisplayMessage[] {
  const planSteps = (plan.steps || []).map((s: any, idx: number) => ({
    id: `plan-${plan.id}-${idx}`,
    intent: s.intent || s.description || `Step ${idx + 1}`,
    action: s.action || 'unknown',
    args: s.args || {},
    status: (s.status as any) || 'pending',
    result: s.result,
  }));
  const id = 'plan-live';
  const existingIdx = prev.findIndex((m) => m.id === id);
  if (existingIdx >= 0) {
    const updated = [...prev];
    updated[existingIdx] = { ...updated[existingIdx], planSteps };
    return updated;
  }
  return [...prev, { id, role: 'tool', content: '', planSteps, timestamp: Date.now() }];
}

/** 产物卡消息 id（live upsert 与历史重放共用，保证不重复渲染） */
export function artifactCardId(artifact: AgentArtifactDto): string {
  return `artifact-${artifact.artifactKey}`;
}

/** ask_user 提问卡 upsert（ask_request 事件与 run_state 快照 pendingAsk 恢复共用；id 稳定幂等） */
export function upsertAskRow(prev: DisplayMessage[], ask: AskCardData): DisplayMessage[] {
  const row: DisplayMessage = {
    id: `ask-${ask.askId}`,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    ask,
  };
  const idx = prev.findIndex((m) => m.id === row.id);
  if (idx >= 0) {
    const next = [...prev];
    next[idx] = row;
    return next;
  }
  return [...prev, row];
}

/** 用产物事件 upsert 一张产物卡消息（release；test_report 走工具行不单独成卡） */
export function upsertArtifactCard(prev: DisplayMessage[], artifact: AgentArtifactDto): DisplayMessage[] {
  if (artifact.type !== 'release') return prev;
  const id = artifactCardId(artifact);
  const existingIdx = prev.findIndex((m) => m.id === id);
  if (existingIdx >= 0) {
    const updated = [...prev];
    updated[existingIdx] = { ...updated[existingIdx], artifact };
    return updated;
  }
  return [...prev, { id, role: 'tool', content: '', artifact, timestamp: Date.now() }];
}

/**
 * 历史消息重放时，把会话产物里的 release 卡按时间戳插回消息流
 * （后端 artifact 没有直接挂 messageId，用「插在最后一条更早的消息后面」归位；
 * live 运行时的卡由 upsertArtifactCard 追加，两者通过同一消息 id 去重）。
 */
export function placeArtifactCards(msgs: DisplayMessage[], artifacts: AgentArtifactDto[]): DisplayMessage[] {
  if (!artifacts || artifacts.length === 0) return msgs;
  const cardArts = artifacts.filter(
    (a) => a.type === 'release' && !msgs.some((m) => m.id === artifactCardId(a))
  );
  if (cardArts.length === 0) return msgs;
  let next = [...msgs];
  for (const art of cardArts) {
    const at = art.updatedAt ? new Date(art.updatedAt).getTime() : Date.now();
    let insertAt = next.length;
    for (let i = next.length - 1; i >= 0; i--) {
      if (next[i].timestamp <= at) {
        insertAt = i + 1;
        break;
      }
    }
    const card: DisplayMessage = {
      id: artifactCardId(art),
      role: 'tool',
      content: '',
      artifact: art,
      timestamp: at,
    };
    next = [...next.slice(0, insertAt), card, ...next.slice(insertAt)];
  }
  return next;
}

/**
 * runs（agent_session_event 派生，含 token 账）→ assistant 回复的 token 用量配对。
 * turnUsage（/turn-usage 按 run 聚合的账本）补缓存命中与模型。
 */
export function attachRunUsage(
  msgs: DisplayMessage[],
  runs: any[],
  skipId?: string | null,
  turnUsage?: Array<{ runId: string; cachedTokens: number; model?: string }>,
): DisplayMessage[] {
  const usageByRun = new Map((turnUsage ?? []).map((u) => [u.runId, u]));
  const usable = (Array.isArray(runs) ? runs : []).filter(
    (r) => Number(r?.promptTokens) > 0 || Number(r?.completionTokens) > 0
  );
  if (usable.length === 0) return msgs;
  const asc = [...usable].sort((a, b) =>
    String(a.startedAt || '').localeCompare(String(b.startedAt || '')));
  const ts = (raw: unknown) => {
    const t = new Date(String(raw || '')).getTime();
    return Number.isFinite(t) ? t : 0;
  };
  const next = msgs.map((m) => ({ ...m }));
  let ri = 0;
  for (const m of next) {
    if (m.role !== 'assistant' || m.id === skipId) continue;
    while (ri < asc.length && ts(asc[ri].startedAt) <= m.timestamp) ri += 1;
    const run = asc[ri - 1];
    if (run) {
      const agg = usageByRun.get(String(run.runId ?? ''));
      m.tokenUsage = {
        promptTokens: Number(run.promptTokens) || 0,
        completionTokens: Number(run.completionTokens) || 0,
        durationMs: run.durationMs != null ? Number(run.durationMs) : undefined,
        cachedTokens: agg && agg.cachedTokens > 0 ? Number(agg.cachedTokens) : undefined,
        model: agg?.model,
      };
    }
  }
  return next;
}

/** 历史加载 / 收敛的完整重建（历史行 → 用量 → 产物卡 → 临时行接回） */
export function rebuildMessages(opts: {
  history: AgentMessage[];
  prev: DisplayMessage[];
  liveId: string | null;
  artifacts: AgentArtifactDto[];
  runs?: any[];
  turnUsage?: any[];
}): DisplayMessage[] {
  const rows = convertMessages(opts.history || []);
  const withUsage = attachRunUsage(rows, opts.runs || [], opts.liveId, opts.turnUsage);
  return appendEphemeralRows(
    placeArtifactCards(withUsage, opts.artifacts),
    opts.prev,
    opts.liveId
  );
}
