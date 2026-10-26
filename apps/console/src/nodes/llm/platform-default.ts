/**
 * llm 节点凭证（modelName / apiHost / apiKey）的平台默认值 —— 手动新建节点与 AI 生成节点同源。
 *
 * 2026-10-25 决策移除运行时注入后，凭证必须以明文落在节点 inputsValues（表单可见、随草稿保存）：
 * AI 走 get(target=knowledge) 的 platformDefaultModel 填入；手动添加此前只能自己抄（表单顶部挂一条
 * 蓝色说明）。这里从同一后端方法取值预填，让两路节点形状一致，说明条也随之撤掉。
 *
 * 缓存短 TTL：用户在模型管理页换默认模型后，新建节点很快跟上，又不至于每个节点一次请求。
 */
import { agentApi } from '../../agent/api';

export interface PlatformLlmDefault {
  modelName?: string;
  apiHost?: string;
  apiKey?: string;
}

export const LLM_CREDENTIAL_KEYS = ['modelName', 'apiHost', 'apiKey'] as const;
export type LlmCredentialKey = (typeof LLM_CREDENTIAL_KEYS)[number];

const CACHE_TTL_MS = 30_000;

let cached: { value: PlatformLlmDefault; at: number } | null = null;
let inflight: Promise<PlatformLlmDefault | null> | null = null;

function pickCredentials(raw: unknown): PlatformLlmDefault | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const next: PlatformLlmDefault = {};
  for (const key of LLM_CREDENTIAL_KEYS) {
    const value = source[key];
    if (typeof value === 'string' && value.trim() !== '') next[key] = value;
  }
  return Object.keys(next).length > 0 ? next : null;
}

/** 已缓存且未过期的平台默认（同步读；没有返回 null） */
export function peekPlatformLlmDefault(): PlatformLlmDefault | null {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  return null;
}

/** 加载平台默认（并发去重；成功缓存 TTL，失败不缓存、下次再试） */
export function loadPlatformLlmDefault(): Promise<PlatformLlmDefault | null> {
  const hit = peekPlatformLlmDefault();
  if (hit) return Promise.resolve(hit);
  if (inflight) return inflight;
  inflight = agentApi
    .getLlmNodeDefault()
    .then((res) => {
      const value = pickCredentials(res);
      if (value) cached = { value, at: Date.now() };
      return value;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** 凭证位是否为空：缺失、裸空串、或 constant 包装的 content 为空 */
export function isBlankCredential(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'object') {
    const wrapper = value as { type?: string; content?: unknown };
    if (wrapper.type && wrapper.type !== 'constant') return false; // ref / expression：静态不判空
    return wrapper.content == null || (typeof wrapper.content === 'string' && wrapper.content.trim() === '');
  }
  return false;
}

/**
 * 把平台默认填进 inputsValues 的空凭证位（原地；已有值一律不覆盖）。
 * 返回实际填入的键，便于调用方决定是否标记变更。
 */
export function fillCredentialDefaults(
  inputsValues: Record<string, unknown>,
  defaults: PlatformLlmDefault | null | undefined
): LlmCredentialKey[] {
  if (!defaults) return [];
  const filled: LlmCredentialKey[] = [];
  for (const key of LLM_CREDENTIAL_KEYS) {
    const value = defaults[key];
    if (!value || !isBlankCredential(inputsValues[key])) continue;
    inputsValues[key] = { type: 'constant', content: value };
    filled.push(key);
  }
  return filled;
}

/** 测试用：清空缓存与在途请求 */
export function resetPlatformLlmDefaultCache(): void {
  cached = null;
  inflight = null;
}
