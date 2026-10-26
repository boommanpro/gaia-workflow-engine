/**
 * llm 节点凭证平台默认预填模块：空位判定、只填空位、请求去重 + TTL 缓存、失败不缓存。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../agent/api', () => ({
  agentApi: { getLlmNodeDefault: vi.fn() },
}));

import { agentApi } from '../../../agent/api';
import {
  fillCredentialDefaults,
  isBlankCredential,
  loadPlatformLlmDefault,
  peekPlatformLlmDefault,
  resetPlatformLlmDefaultCache,
} from '../platform-default';

const mockedGet = agentApi.getLlmNodeDefault as unknown as ReturnType<typeof vi.fn>;

describe('isBlankCredential', () => {
  it('缺失 / 空串 / constant 空内容为空；有值、ref/expression 包装不为空', () => {
    expect(isBlankCredential(undefined)).toBe(true);
    expect(isBlankCredential(null)).toBe(true);
    expect(isBlankCredential('')).toBe(true);
    expect(isBlankCredential('   ')).toBe(true);
    expect(isBlankCredential({ type: 'constant', content: '' })).toBe(true);
    expect(isBlankCredential({ type: 'constant', content: null })).toBe(true);
    expect(isBlankCredential({ type: 'constant', content: 'glm-4-flash' })).toBe(false);
    expect(isBlankCredential('glm-4-flash')).toBe(false);
    // 引用上游（如 start 入参）静态无法判空：不当空位，不覆盖
    expect(isBlankCredential({ type: 'ref', content: ['start_1', 'key'] })).toBe(false);
    expect(isBlankCredential({ type: 'expression', content: 'a+b' })).toBe(false);
  });
});

describe('fillCredentialDefaults', () => {
  it('只填空位，已有值 / ref 不覆盖；返回实际填入的键；constant 包装形状', () => {
    const inputsValues: Record<string, unknown> = {
      prompt: { type: 'template', content: 'p' },
      apiKey: { type: 'constant', content: 'sk-user-own' },
      apiHost: { type: 'ref', content: ['start_1', 'host'] },
    };
    const filled = fillCredentialDefaults(inputsValues, {
      modelName: 'glm-4-flash',
      apiHost: 'https://platform.invalid/v1',
      apiKey: 'sk-platform',
    });
    expect(filled).toEqual(['modelName']);
    expect(inputsValues.modelName).toEqual({ type: 'constant', content: 'glm-4-flash' });
    expect(inputsValues.apiKey).toEqual({ type: 'constant', content: 'sk-user-own' });
    expect(inputsValues.apiHost).toEqual({ type: 'ref', content: ['start_1', 'host'] });
    expect(inputsValues.prompt).toEqual({ type: 'template', content: 'p' });
  });

  it('平台默认为空 / 缺某项：对应位保持为空，不写空串', () => {
    const inputsValues: Record<string, unknown> = {};
    expect(fillCredentialDefaults(inputsValues, null)).toEqual([]);
    expect(fillCredentialDefaults(inputsValues, { modelName: 'm' })).toEqual(['modelName']);
    expect(inputsValues.apiKey).toBeUndefined();
    expect(inputsValues.apiHost).toBeUndefined();
  });
});

describe('loadPlatformLlmDefault', () => {
  beforeEach(() => {
    resetPlatformLlmDefaultCache();
    mockedGet.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('并发去重 + TTL 内缓存：三次调用只请求一次；peek 同步可读', async () => {
    mockedGet.mockResolvedValue({ success: true, modelName: 'glm-4-flash', apiHost: 'https://p.invalid/v1', apiKey: 'sk-p' });
    const [a, b] = await Promise.all([loadPlatformLlmDefault(), loadPlatformLlmDefault()]);
    const c = await loadPlatformLlmDefault();
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ modelName: 'glm-4-flash', apiHost: 'https://p.invalid/v1', apiKey: 'sk-p' });
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(peekPlatformLlmDefault()).toBe(a);
  });

  it('请求失败返回 null 且不缓存：下次调用重试', async () => {
    mockedGet.mockRejectedValueOnce(new Error('network'));
    expect(await loadPlatformLlmDefault()).toBeNull();
    expect(peekPlatformLlmDefault()).toBeNull();
    mockedGet.mockResolvedValueOnce({ success: true, modelName: 'm', apiHost: 'h', apiKey: 'k' });
    expect(await loadPlatformLlmDefault()).toEqual({ modelName: 'm', apiHost: 'h', apiKey: 'k' });
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it('后端未配置（三项全空）视为无默认：返回 null、不缓存', async () => {
    mockedGet.mockResolvedValue({ success: true, modelName: '', apiHost: '  ' });
    expect(await loadPlatformLlmDefault()).toBeNull();
    expect(peekPlatformLlmDefault()).toBeNull();
  });

  it('TTL 过期后重新请求（模型管理换默认模型后新建节点很快跟上）', async () => {
    vi.useFakeTimers();
    mockedGet.mockResolvedValueOnce({ success: true, modelName: 'old', apiHost: 'h', apiKey: 'k' });
    expect(await loadPlatformLlmDefault()).toMatchObject({ modelName: 'old' });
    vi.advanceTimersByTime(31_000);
    expect(peekPlatformLlmDefault()).toBeNull();
    mockedGet.mockResolvedValueOnce({ success: true, modelName: 'new', apiHost: 'h', apiKey: 'k' });
    expect(await loadPlatformLlmDefault()).toMatchObject({ modelName: 'new' });
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });
});
