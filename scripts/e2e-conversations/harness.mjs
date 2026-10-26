/**
 * Gaia 30 对话评测 harness（2026-10-25）
 *
 * 通道：
 *  - 会话驱动：POST /api/agent/session/create → POST /{key}/run → GET /{key}/status（含 pendingAsk 自动应答）
 *  - 草稿读取：GET /{key}/document
 *  - 独立试运行：POST /api/task/run（schema=publicDoc JSON 串，与 agent run 工具同源）→ GET report/result
 */

const BASE = process.env.GAIA_BASE || 'http://127.0.0.1:48080';

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function api(method, path, body, timeoutMs = 60000) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok && res.status >= 500) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function createSession(title) {
  const s = await api('POST', '/api/agent/session/create', { title, scope: 'chat' });
  if (!s?.sessionKey) throw new Error('create session failed: ' + JSON.stringify(s));
  return s.sessionKey;
}

export function getStatus(key) {
  return api('GET', `/api/agent/session/${key}/status`);
}

export function getDoc(key) {
  return api('GET', `/api/agent/session/${key}/document`);
}

export function getMessages(key) {
  return api('GET', `/api/agent/session/${key}/messages`);
}

/**
 * 等待一次自治运行结束。pendingAsk 出现时用 onAsk(ask) 的返回值自动作答。
 */
export async function waitRunDone(key, { maxWaitSec = 900, pollSec = 2, onAsk = null } = {}) {
  const t0 = Date.now();
  const asksAnswered = [];
  for (;;) {
    if ((Date.now() - t0) / 1000 > maxWaitSec) {
      return { status: 'timeout', asksAnswered };
    }
    const st = await getStatus(key);
    const ask = st?.pendingAsk;
    if (ask?.askId) {
      const answer = onAsk ? onAsk(ask) : '按你推荐的口径继续，并在最终回复里说明你采用的假设。';
      await api('POST', `/api/agent/session/${key}/ask/${ask.askId}/answer`, { answer });
      asksAnswered.push({ askId: ask.askId, question: ask.question, answer });
      await sleep(pollSec * 1000);
      continue;
    }
    if (st?.status && st.status !== 'running') {
      return { status: st.status, st, asksAnswered };
    }
    await sleep(pollSec * 1000);
  }
}

/**
 * 独立试运行：把会话草稿交给 /api/task/run（与画布试运行同入口）。
 * 返回 { ok, taskId, workflowStatus, outputs, nodes, errors, issues }。
 */
export async function runTrial(docOrSchema, inputs, { maxWaitSec = 300 } = {}) {
  const schema = typeof docOrSchema === 'string' ? docOrSchema : JSON.stringify(docOrSchema);
  const start = await api('POST', '/api/task/run', { schema, inputs });
  if (start?.taskID == null) {
    return { ok: false, errors: start?.errors ?? ['no taskID'], issues: start?.issues ?? [] };
  }
  const taskId = start.taskID;
  const t0 = Date.now();
  let report = null;
  for (;;) {
    if ((Date.now() - t0) / 1000 > maxWaitSec) {
      return { ok: false, taskId, workflowStatus: 'timeout', errors: ['trial run timeout'] };
    }
    report = await api('GET', `/api/task/report?taskID=${taskId}`);
    const ws = report?.workflowStatus?.status;
    if (ws && !['pending', 'processing'].includes(ws)) break;
    await sleep(1000);
  }
  const result = await api('GET', `/api/task/result?taskID=${taskId}`);
  const detail = await api('GET', `/api/task/runs/${taskId}`);
  return {
    ok: true,
    taskId,
    workflowStatus: report?.workflowStatus?.status,
    outputs: result?.outputs ?? {},
    nodes: report?.reports ?? {},
    runDetail: detail,
  };
}

/** 断言收集器 */
export class Checks {
  constructor(caseId) {
    this.caseId = caseId;
    this.items = [];
  }
  add(name, pass, detail = '') {
    this.items.push({ case: this.caseId, name, pass: !!pass, detail: String(detail).slice(0, 500) });
    return pass;
  }
  get failures() {
    return this.items.filter((i) => !i.pass);
  }
}

/** 草稿辅助 */
export function nodesByType(doc) {
  const map = {};
  for (const n of doc?.nodes ?? []) {
    (map[n.type] = map[n.type] ?? []).push(n);
  }
  return map;
}

export function nodeById(doc, id) {
  return (doc?.nodes ?? []).find((n) => n.id === id);
}

export function edgesOf(doc) {
  return doc?.edges ?? [];
}

/** flowgram 边字段兼容 */
export function edgeSrc(e) {
  return e.sourceNodeID ?? e.source ?? e.sourceNodeId;
}
export function edgeDst(e) {
  return e.targetNodeID ?? e.target ?? e.targetNodeId;
}
export function edgePort(e) {
  return e.sourceHandle ?? e.sourcePortID ?? e.sourcePort ?? null;
}

/** 顶层某类型节点的 blocks（循环体） */
export function loopBlocks(doc) {
  const loops = nodesByType(doc).loop ?? [];
  return loops.map((l) => ({
    id: l.id,
    loopFor: l.data?.loopFor,
    loopOutputs: l.data?.loopOutputs,
    blocks: l.blocks ?? [],
    edges: l.edges ?? [],
  }));
}

/** 在节点 data（含 inputsValues/inputsValues 嵌套）里找模板引用串 */
export function templatesOf(node) {
  const out = [];
  const walk = (v) => {
    if (typeof v === 'string') {
      if (v.includes('{{')) out.push(v);
    } else if (v && typeof v === 'object') {
      if (v.type === 'template' && typeof v.content === 'string') out.push(v.content);
      for (const x of Object.values(v)) walk(x);
    }
  };
  walk(node?.data ?? {});
  return out;
}

/** 深取值：'a.b.0.c' */
export function deepGet(obj, path) {
  return path
    .split('.')
    .reduce((acc, k) => (acc == null ? undefined : Array.isArray(acc) ? acc[Number(k)] : acc[k]), obj);
}

export function fmt(v) {
  return JSON.stringify(v);
}

/** 断言一次试运行成功并返回是否可继续后续输出断言 */
export function runOk(c, run, label = '试运行') {
  if (!run?.ok) {
    c.add(`${label}被接受`, false, (run?.errors ?? []).map((e) => String(e).slice(0, 150)).join(';'));
    return false;
  }
  const ok = run.workflowStatus === 'success' || run.workflowStatus === 'succeeded';
  c.add(`${label}成功`, ok, `status=${run.workflowStatus}`);
  return ok;
}

/** 断言一次试运行按预期失败（负向用例） */
export function runFail(c, run, label = '试运行') {
  if (!run?.ok) {
    c.add(`${label}被接受`, false, (run?.errors ?? []).map((e) => String(e).slice(0, 150)).join(';'));
    return false;
  }
  const failed = ['fail', 'failed', 'canceled', 'canceled'].includes(run.workflowStatus);
  c.add(`${label}失败可见`, failed, `status=${run.workflowStatus}`);
  return failed;
}
