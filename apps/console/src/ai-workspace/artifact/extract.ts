/**
 * 从 Agent 对话流中识别「工作流产物」。
 *
 * AI 主视角下，工作流是最终产物 —— 但 AI 可能通过多种途径把它交出来：
 *   - 后端自治执行 applyWorkflow 工具，结果作为 tool 消息回灌
 *   - 前端执行 canvas 工具后的 tool 结果
 *   - 模型直接在正文里吐一段 ```json
 * 本模块统一把这些「可能藏着工作流的文本」收敛成一个候选对象。
 */
import type { DisplayMessage } from '../../agent/types';

/** 候选产物 */
export interface WorkflowCandidate {
  /** 来源消息 id，用于去重（同一条消息只应用一次） */
  messageId: string;
  /**
   * 这条产物「属于」哪条助手消息 —— 画布快照卡要渲染在它下面。
   * 若是工具消息（toolcall-xxx）则回溯到往前最近的 assistant 占位；
   * 若是助手消息本身则就是它自己。用这个 id 归因，刷新页面 / 挂载即恢复
   * 的历史也能正确挂卡，不必依赖「当前生成轮」这种有时序巧合的上下文。
   */
  ownerMessageId: string;
  /** 解包后的原始工作流对象 */
  raw: unknown;
  /**
   * 这条消息同时带回了落版信息时记下来。
   * 作用：刷新页面后产物依然能挂回「它属于哪个工作流」，
   * 否则用户会看到一份产物却打不开对应的编辑器。
   */
  workflowCode?: string;
  workflowName?: string;
}

const NODES_KEYS = ['nodes', 'nodeList', 'steps'];
/** 工具结果常见的嵌套字段名（会递归下钻去找真正的 {nodes, edges}） */
const WRAPPER_KEYS = [
  'dsl',
  'workflowData',
  'workflow',
  'templateData',
  'data',
  'result',
  'content',
];

/** 判断一个对象是否具备工作流的形状 */
function isWorkflowShape(obj: unknown): obj is Record<string, any> {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as Record<string, any>;
  const key = NODES_KEYS.find((k) => Array.isArray(candidate[k]) && candidate[k].length > 0);
  if (!key) return false;
  const first = candidate[key][0];
  return !!first && typeof first === 'object';
}

/**
 * 递归下钻，剥掉工具结果的外层包装（success / dsl / workflowData …）。
 * JSON.parse 出来的对象天然无环，这里不必担心循环引用。
 */
function unwrap(obj: unknown, depth = 0): Record<string, any> | null {
  if (isWorkflowShape(obj)) return obj;
  if (!obj || typeof obj !== 'object' || depth > 4) return null;

  for (const key of WRAPPER_KEYS) {
    const value = (obj as Record<string, any>)[key];
    if (typeof value === 'string') {
      const parsed = safeJsonParse(value);
      const found = parsed ? unwrap(parsed, depth + 1) : null;
      if (found) return found;
    } else if (value && typeof value === 'object') {
      const found = unwrap(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

export function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * 扫描文本里所有「括号配对完整」的 JSON 对象。
 * 模型边流式输出边截断的场景下，半截 JSON 会被自然忽略。
 */
export function extractJsonObjects(text: string): unknown[] {
  const found: unknown[] = [];
  for (let start = 0; start < text.length; start++) {
    if (text[start] !== '{') continue;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const parsed = safeJsonParse(text.slice(start, i + 1));
          if (parsed) found.push(parsed);
          start = i;
          break;
        }
      }
    }
  }
  return found;
}

/** 在若干 JSON 文本里按候选路径找第一个非空字符串字段 */
function findStringField(sources: string[], paths: string[][]): string | null {
  for (const source of sources) {
    const roots: unknown[] = [];
    const direct = safeJsonParse(source);
    if (direct) roots.push(direct);
    roots.push(...extractJsonObjects(source));

    for (const root of roots) {
      for (const path of paths) {
        let cursor: any = root;
        for (const segment of path) {
          if (!cursor || typeof cursor !== 'object') {
            cursor = undefined;
            break;
          }
          cursor = cursor[segment];
        }
        if (typeof cursor === 'string' && cursor.trim()) return cursor.trim();
      }
    }
  }
  return null;
}

/** 从单条消息里找出工作流产物（找不到返回 null） */
export function findWorkflowInMessage(message: DisplayMessage): WorkflowCandidate | null {
  const sources: string[] = [];
  if (message.content) sources.push(message.content);
  if (message.toolCall?.result) sources.push(message.toolCall.result);
  if (message.toolCall?.args) {
    try {
      sources.push(JSON.stringify(message.toolCall.args));
    } catch {
      /* 忽略无法序列化的参数 */
    }
  }

  // 落版信息只从工具调用里取，避免把 AI 正文里顺口提到的编号也当成事实
  const toolSources: string[] = [];
  if (message.toolCall?.result) toolSources.push(message.toolCall.result);
  if (message.toolCall?.args) {
    try {
      toolSources.push(JSON.stringify(message.toolCall.args));
    } catch {
      /* ignore */
    }
  }
  const workflowCode = findStringField(toolSources, [
    ['persisted', 'workflowCode'],
    ['workflowCode'],
  ]);
  const workflowName = findStringField(toolSources, [
    ['workflowName'],
    ['persisted', 'workflowName'],
  ]);

  const decorate = (hit: WorkflowCandidate): WorkflowCandidate => ({
    ...hit,
    ...(workflowCode ? { workflowCode } : {}),
    ...(workflowName ? { workflowName } : {}),
  });

  for (const source of sources) {
    // 1) 整段就是 JSON
    const direct = safeJsonParse(source);
    const directHit = direct ? unwrap(direct) : null;
    if (directHit) return decorate({ messageId: message.id, ownerMessageId: message.id, raw: directHit });

    // 2) 正文里混杂的 JSON 片段（含 ```json 代码块）
    for (const obj of extractJsonObjects(source)) {
      const hit = unwrap(obj);
      if (hit) return decorate({ messageId: message.id, ownerMessageId: message.id, raw: hit });
    }
  }
  return null;
}

/** 在整条对话里找最近一次出现的工作流产物（从后往前扫） */
export function findLatestWorkflow(messages: DisplayMessage[]): WorkflowCandidate | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const hit = findWorkflowInMessage(messages[i]);
    if (!hit) continue;
    // 回溯到这条产物「属于」的助手消息：从当前位置往前找最近的 assistant。
    // 工具消息（toolcall-xxx）自身不是助手消息，卡要挂在它前面的那条助手占位下。
    let ownerMessageId = hit.messageId;
    for (let j = i; j >= 0; j--) {
      if (messages[j].role === 'assistant') {
        ownerMessageId = messages[j].id;
        break;
      }
    }
    return { ...hit, ownerMessageId };
  }
  return null;
}
