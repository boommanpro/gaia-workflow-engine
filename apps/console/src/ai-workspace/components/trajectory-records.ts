/**
 * Trajectory 记录模型与装配逻辑（纯函数，供 TrajectoryPanel 渲染与单测使用）。
 *
 * 数据源：agent_session_event（事件流）+ agent_llm_call_log（LLM 调用账本）。
 * 账本的 request_json 为增量存储（seq>1 只存与 seq=1 公共前缀之后的尾部），
 * 这里负责拼回「模型真实收到的完整请求」并标注数据口径——调试时必须能区分
 * 「拼回全量 / 原始存储形态 / 截断摘要」三种口径，否则跟进问题会被误导。
 */

export type RecKind = 'user' | 'system' | 'model' | 'tool' | 'message' | 'context' | 'info' | 'error';

/** 账本行的数据口径标注（模型行专用） */
export interface RequestMeta {
  /** 存储为增量形态（sharedMessages） */
  incremental: boolean;
  /** 增量行是否成功拼回全量 */
  assembled: boolean;
  /** 与基准共享的消息条数 */
  sharedPrefix?: number;
  /** 基准行（该 run 的 seq=1）的全局请求号 */
  baseRequestNo?: number;
  /** 无 request_json，仅 promptDigest（挖洞截断口径） */
  digestOnly?: boolean;
  /** 无 response_json，仅 outputDigest */
  responseDigestOnly?: boolean;
}

export interface TrajectoryRecord {
  id: string;
  kind: RecKind;
  /** 1-based 轮次（gaia 的 run 即 dsh 的 turn） */
  run: number;
  runId?: string;
  at: number;
  endAt?: number;
  durationMs?: number | null;
  /** 台账主文本 */
  text: string;
  /** 工具行内「→ 结果」预览 */
  resultText?: string;
  isError?: boolean;
  isRunning?: boolean;
  /** 详情载荷 */
  content?: string;
  /** 消息行的思考过程全文（assistant_settled.thinking，as-service 等托管引擎提供） */
  thinking?: string;
  args?: unknown;
  result?: unknown;
  request?: unknown;
  /** 增量行的原始存储形态（未拼回），供「原始存储」口径切换 */
  requestRaw?: unknown;
  /** 请求/响应的数据口径（模型行） */
  requestMeta?: RequestMeta;
  response?: unknown;
  usage?: { promptTokens?: number; completionTokens?: number; cachedTokens?: number };
  model?: string;
  status?: string;
  messagesCount?: number;
  toolsCount?: number;
  /** 会话内全局请求号（模型行左侧边界点显示） */
  requestNo?: number;
  /** 搜索索引文本 */
  search: string;
}

export const KIND_META: Record<RecKind, { label: string; icon: string; lane: 0 | 1 | 2 }> = {
  user: { label: '用户', icon: '👤', lane: 0 },
  system: { label: '系统', icon: '⚙', lane: 0 },
  context: { label: '上下文', icon: '🗂', lane: 0 },
  model: { label: '模型', icon: '✳', lane: 1 },
  message: { label: '正文', icon: '✳', lane: 1 },
  info: { label: '收尾', icon: 'ℹ', lane: 1 },
  tool: { label: '工具', icon: '🔧', lane: 2 },
  error: { label: '错误', icon: '⚠', lane: 2 },
};

export const parseAt = (raw?: string): number => {
  if (!raw) return 0;
  return new Date(raw.includes('T') ? raw : raw.replace(' ', 'T')).getTime() || 0;
};

export const firstLine = (s: string, max = 90): string => {
  const line = (s || '').split('\n', 1)[0].trim();
  return line.length > max ? line.slice(0, max) + '…' : line;
};

export const fmtDuration = (ms?: number | null): string => {
  const n = Math.max(0, Number(ms) || 0);
  if (!n) return '';
  if (n < 1000) return `${Math.round(n)}ms`;
  if (n < 60000) return `${(n / 1000).toFixed(1)}s`;
  return `${Math.floor(n / 60000)}m${Math.round((n % 60000) / 1000)}s`;
};

export const fmtTok = (n?: number): string => {
  const v = Number(n) || 0;
  if (v <= 0) return '—';
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
};

/** 工具结果 payload → 行内结果预览（提取 message/output 摘要） */
function resultPreview(payload?: string): string {
  if (!payload) return '';
  try {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed === 'object') {
      const err = (parsed as any).error;
      if (err && typeof err === 'object') return String(err.message || 'error');
      if (typeof (parsed as any).message === 'string') return (parsed as any).message;
      if (typeof (parsed as any).summary === 'string') return (parsed as any).summary;
      const outs = (parsed as any).outputs;
      if (outs && typeof outs === 'object') return JSON.stringify(outs).slice(0, 90);
    }
    return JSON.stringify(parsed).slice(0, 90);
  } catch {
    return firstLine(payload, 90);
  }
}

const safeParse = (value: unknown): unknown => {
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};

/**
 * 事件流 + LLM 账本 → 时间序记录。
 *
 * request_json 口径规则（与后端 compressRequestJson 对齐）：
 *   · seq=1（或前缀失配，如压缩重写历史后）= 全量形态；
 *   · 其余行 = {sharedMessages, baseSeq:1, toolsSameAsBase, messages:[尾部]}，
 *     恒以该 run 的 seq=1 为基准拼回；tools 同基准时后端不重复存，拼回时并入。
 *   · 基准行必须带 tools 数组——压缩摘要等旁路调用（无 tools）不得充当基准。
 *   · 基准缺失（如超出拉取上限）时保留原始存储形态，由 requestMeta.assembled=false 标注。
 */
export function buildRecords(events: any[], llmCalls: any[]): TrajectoryRecord[] {
  const asc = [...(Array.isArray(events) ? events : [])].reverse();
  const runOrder: string[] = [];
  const runOf = (runId?: string | null, fallback?: string): string => {
    const key = runId || fallback || 'session';
    if (!runOrder.includes(key)) runOrder.push(key);
    return key;
  };

  // 工具调用配对（tool_call_id → 行）
  const openTools = new Map<string, TrajectoryRecord>();
  const records: TrajectoryRecord[] = [];
  let lastRunKey: string | undefined;

  const push = (rec: TrajectoryRecord, runKey: string) => {
    lastRunKey = runKey;
    records.push(rec);
  };
  const runIndex = (key: string) => runOrder.indexOf(key) + 1;

  for (const ev of asc) {
    const type = ev.eventType;
    let data: any = {};
    try {
      data = ev.payload ? JSON.parse(ev.payload) : {};
    } catch { /* payload 不可解析则当空载荷 */ }
    const at = parseAt(ev.createdAt);
    const runKey = runOf(ev.runId, lastRunKey);

    if (type === 'run_input') {
      push({
        id: `u-${ev.id}`, kind: 'user', run: runIndex(runKey), runId: runKey, at,
        text: firstLine(String(data.content || '')),
        content: String(data.content || ''),
        search: `user ${data.content || ''}`,
      }, runKey);
    } else if (type === 'user_message') {
      push({
        id: `m-${ev.id}`, kind: 'user', run: runIndex(runKey), runId: runKey, at,
        text: firstLine(String(data.content || '')),
        content: String(data.content || ''),
        search: `user ${data.content || ''}`,
      }, runKey);
    } else if (type === 'run_prompt') {
      const messages = Array.isArray(data.messages) ? data.messages : [];
      const tools = Array.isArray(data.tools) ? data.tools : [];
      push({
        id: `p-${ev.id}`, kind: 'system', run: runIndex(runKey), runId: runKey, at,
        text: `会话提示 · ${data.count ?? messages.length} 条消息 / ${tools.length} 个工具`,
        request: messages.length > 0 ? messages : data,
        messagesCount: data.count ?? messages.length,
        toolsCount: tools.length,
        search: `system prompt ${messages.length}`,
      }, runKey);
    } else if (type === 'tool_call') {
      const rec: TrajectoryRecord = {
        id: `t-${ev.id}`, kind: 'tool', run: runIndex(runKey), runId: runKey, at,
        text: `${data.name || ''} ${firstLine(typeof data.args === 'string' ? data.args : JSON.stringify(data.args || {}), 60)}`,
        args: data.args,
        isRunning: true,
        search: `tool ${data.name || ''} ${JSON.stringify(data.args || {})}`,
      };
      records.push(rec);
      lastRunKey = runKey;
      if (data.id) openTools.set(data.id, rec);
    } else if (type === 'tool_result') {
      const rec = openTools.get(data.toolCallId);
      if (rec) {
        rec.endAt = at;
        rec.durationMs = Math.max(0, at - rec.at);
        rec.result = data.payload;
        rec.resultText = resultPreview(data.payload);
        rec.isRunning = false;
        rec.isError = data.outcome && data.outcome !== 'SUCCESS';
        rec.status = data.outcome;
        rec.search += ` ${String(data.payload || '').slice(0, 2000)}`;
        openTools.delete(data.toolCallId);
      }
    } else if (type === 'assistant_settled') {
      push({
        id: `a-${ev.id}`, kind: 'message', run: runIndex(runKey), runId: runKey, at,
        text: firstLine(String(data.content || ''), 120),
        content: String(data.content || ''),
        thinking: data.thinking ? String(data.thinking) : undefined,
        usage: { promptTokens: data.promptTokens, completionTokens: data.completionTokens },
        search: `message ${data.content || ''} ${data.thinking || ''}`.slice(0, 4000),
      }, runKey);
    } else if (type === 'compaction' || type === 'skill_loaded') {
      push({
        id: `c-${ev.id}`, kind: 'context', run: runIndex(runKey), runId: runKey, at,
        text: type === 'compaction'
          ? `历史压缩：${data.before ?? '?'} → ${data.after ?? '?'} 条`
          : `技能加载：${firstLine(String(data.name || ''), 80)}`,
        args: data,
        search: `${type} ${JSON.stringify(data).slice(0, 500)}`,
      }, runKey);
    } else if (type === 'llm_retry' || type === 'wrap_up' || type === 'interrupted' || type === 'repeat_reminder') {
      const labelMap: Record<string, string> = {
        llm_retry: '模型重试', wrap_up: '收尾指令', interrupted: '已中断', repeat_reminder: '复读提醒',
      };
      push({
        id: `g-${ev.id}`, kind: 'context', run: runIndex(runKey), runId: runKey, at,
        text: (labelMap[type] || type)
          + (data.message ? `：${firstLine(String(data.message), 60)}` : ''),
        args: data,
        search: `${type} ${data.message || ''}`,
      }, runKey);
    } else if (type === 'error') {
      push({
        id: `e-${ev.id}`, kind: 'error', run: runIndex(runKey), runId: runKey, at,
        text: firstLine(String(data.message || '运行错误'), 120),
        content: String(data.message || ''),
        isError: true,
        search: `error ${data.message || ''}`,
      }, runKey);
    } else if (type === 'run_end') {
      const parts: string[] = [`模型 ${data.turns ?? '?'} 轮`];
      if (data.durationMs != null) parts.push(`共 ${(Number(data.durationMs) / 1000).toFixed(1)}s`);
      if (data.toolTimeMs != null) parts.push(`工具 ${(Number(data.toolTimeMs) / 1000).toFixed(1)}s`);
      push({
        id: `r-${ev.id}`, kind: 'info', run: runIndex(runKey), runId: runKey, at,
        text: `${{ done: '本轮完成', stopped: '本轮已停止', error: '本轮失败' }[data.outcome as string] || '本轮结束'} · ${parts.join(' · ')}`,
        durationMs: data.durationMs,
        args: data,
        usage: { promptTokens: data.promptTokens, completionTokens: data.completionTokens },
        search: `run_end ${JSON.stringify(data).slice(0, 400)}`,
      }, runKey);
    }
  }

  // 模型调用（generation）：请求号按时间全局编号；request_json 增量拼回 + 口径标注
  const calls = Array.isArray(llmCalls) ? [...llmCalls] : [];
  calls.sort((a, b) =>
    parseAt(a.createdAt) - parseAt(b.createdAt) || String(a.runId || '').localeCompare(String(b.runId || '')));
  /** 该 run 的拼回基准：seq=1 的全量请求（messages + tools） */
  const baseByRun = new Map<string, { messages: unknown[]; tools: unknown[]; requestNo: number }>();
  let requestNo = 0;
  for (const call of calls) {
    requestNo += 1;
    const at = parseAt(call.createdAt);
    const runKey = runOf(call.runId, lastRunKey);
    const rawParsed = safeParse(call.requestJson) as any;
    const isFullShape = !!rawParsed && typeof rawParsed === 'object' && !Array.isArray(rawParsed)
      && Array.isArray(rawParsed.messages) && rawParsed.sharedMessages == null;
    const seqNum = Number(call.seq);
    if (isFullShape && Array.isArray(rawParsed.tools)
      && (seqNum === 1 || (!baseByRun.has(runKey) && !Number.isFinite(seqNum)))) {
      baseByRun.set(runKey, { messages: rawParsed.messages, tools: rawParsed.tools, requestNo });
    }

    const meta: RequestMeta = { incremental: false, assembled: false };
    let request: unknown = rawParsed;
    let requestRaw: unknown;
    if (rawParsed && typeof rawParsed === 'object' && !Array.isArray(rawParsed) && rawParsed.sharedMessages != null) {
      meta.incremental = true;
      meta.sharedPrefix = Number(rawParsed.sharedMessages) || 0;
      requestRaw = rawParsed;
      const base = baseByRun.get(runKey);
      if (base) {
        const { sharedMessages: _s, baseSeq: _b, toolsSameAsBase: _t, ...storedRest } = rawParsed;
        const tail = Array.isArray(rawParsed.messages) ? rawParsed.messages : [];
        request = {
          ...storedRest,
          messages: [...base.messages.slice(0, meta.sharedPrefix), ...tail],
          ...(rawParsed.toolsSameAsBase && !Array.isArray(storedRest.tools) ? { tools: base.tools } : {}),
        };
        meta.assembled = true;
        meta.baseRequestNo = base.requestNo;
      } else {
        // 基准缺失（如超出拉取上限）：保留原始存储形态，宁残缺不造假
        request = rawParsed;
      }
    } else if (!rawParsed && call.promptDigest) {
      meta.digestOnly = true;
      request = call.promptDigest;
    }

    let response: unknown = call.responseJson != null ? safeParse(call.responseJson) : null;
    if (response == null && call.outputDigest) {
      response = call.outputDigest;
      meta.responseDigestOnly = true;
    }

    records.push({
      id: `g-${call.id}`, kind: 'model', run: runIndex(runKey), runId: runKey, at,
      durationMs: call.durationMs,
      text: `${call.model || ''} · ${call.messagesCount ?? rawParsed?.messages?.length ?? '?'} 条消息`,
      model: call.model,
      status: call.status,
      isError: call.status === 'error',
      requestNo,
      request: request ?? call.promptDigest,
      requestRaw,
      requestMeta: meta,
      response,
      usage: { promptTokens: call.promptTokens, completionTokens: call.completionTokens, cachedTokens: call.cachedTokens },
      messagesCount: call.messagesCount,
      toolsCount: call.toolsCount,
      search: `model ${call.model || ''} ${call.status || ''} ${String(call.promptDigest || '')} ${String(call.outputDigest || '')}`,
    });
  }

  records.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  return records;
}
