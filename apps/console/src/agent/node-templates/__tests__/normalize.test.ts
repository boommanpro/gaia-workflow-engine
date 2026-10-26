import { describe, expect, it } from 'vitest';

import { cloneDefaultData } from '../index';
import { normalizeNodeData } from '../normalize';

describe('HTTP normalize 幂等性', () => {
  it.each([
    cloneDefaultData('http'),
    { body: { bodyType: 'JSON', json: { type: 'template', content: '{"k":"v"}' } }, timeout: { timeout: 8000, retryTimes: 2 } },
    { body: { bodyType: 'none' }, timeout: { timeout: 0, retryTimes: 0 } },
  ])('保留规范 body 和 timeout：%j', (input) => {
    const snapshot = structuredClone(input);
    const result = normalizeNodeData('http', input);
    expect(result.body).toEqual(input.body);
    expect(result.timeout).toEqual(input.timeout);
    expect(normalizeNodeData('http', result)).toEqual(result);
    expect(input).toEqual(snapshot);
    expect(result.body).not.toBe(input.body);
    expect(result.timeout).not.toBe(input.timeout);
  });

  it.each([
    ['{"k":"v"}', 8000, '{"k":"v"}', 8000],
    [{ k: 'v' }, '5000', '{"k":"v"}', 5000],
    ['', 0, '', 0],
  ])('扁平输入重复归一化保持稳定：%j', (body, timeout, content, milliseconds) => {
    const input = { method: 'post', url: '/hook', headers: { Accept: 'application/json' }, params: { q: 'test' }, body, timeout };
    const snapshot = structuredClone(input);
    const result = normalizeNodeData('http', input);
    expect(result.body).toEqual({ bodyType: 'JSON', json: { type: 'template', content } });
    expect(result.timeout).toEqual({ timeout: milliseconds });
    expect(result.api).toEqual({ method: 'POST', url: '/hook' });
    expect(result.headersValues.Accept.content).toBe('application/json');
    expect(result.paramsValues.q.content).toBe('test');
    expect(normalizeNodeData('http', result)).toEqual(result);
    expect(input).toEqual(snapshot);
  });
});
