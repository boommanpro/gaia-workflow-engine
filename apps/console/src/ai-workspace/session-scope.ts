/**
 * 会话 ↔ 工作流 的归属关系。
 *
 * 「从主页面跳到工作流，数据整体承接」承接的不该只有 DSL，还包括对话本身：
 * 产出这个工作流的那段对话，应该跟着它一起进专家模式。
 * 反过来，打开一个不相干的工作流时，也不该把别的会话上下文糊上去 ——
 * 否则画布上是 A、对话里在聊 B，用户只会觉得「怪」。
 *
 * 后端 session 表没有 workflowCode 字段（也不打算为它加迁移），
 * 所以这层映射放在前端 localStorage：够用、零迁移、跨刷新稳定。
 */
import type { AgentSession } from '../agent/types';

const STORAGE_KEY = 'gaia.sessionWorkflowBinding';

type Binding = Record<string, string>; // sessionKey -> workflowCode

function read(): Binding {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function write(binding: Binding): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(binding));
  } catch {
    /* 隐私模式下写不进去也不影响本次会话 */
  }
}

/** 把一段会话绑定到某个工作流（同一个会话只会绑定最后一次工作流） */
export function bindSessionToWorkflow(sessionKey: string, workflowCode: string): void {
  if (!sessionKey || !workflowCode) return;
  const binding = read();
  if (binding[sessionKey] === workflowCode) return;
  binding[sessionKey] = workflowCode;
  write(binding);
}

/** 这段会话属于哪个工作流 */
export function getWorkflowOfSession(sessionKey: string | null): string | null {
  if (!sessionKey) return null;
  return read()[sessionKey] || null;
}

/** 找出归属于该工作流的会话（取最近更新的那个） */
export function findSessionForWorkflow(
  sessions: AgentSession[],
  workflowCode: string | null
): string | null {
  if (!workflowCode) return null;
  const binding = read();
  const matches = sessions.filter((s) => binding[s.sessionKey] === workflowCode);
  if (matches.length === 0) return null;
  matches.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return matches[0].sessionKey;
}

/** 不依赖会话列表的反向解析：这个工作流最近被哪段会话绑定过（发布收口用）。
 *  对象键序即绑定写入顺序，遍历取最后命中的即为最近绑定。 */
export function getSessionKeyForWorkflow(workflowCode: string | null): string | null {
  if (!workflowCode) return null;
  const binding = read();
  let found: string | null = null;
  for (const [sessionKey, code] of Object.entries(binding)) {
    if (code === workflowCode) found = sessionKey;
  }
  return found;
}
