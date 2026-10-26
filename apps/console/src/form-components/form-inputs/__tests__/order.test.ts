import { describe, expect, it } from 'vitest';

import { orderInputKeys } from '../order';

describe('orderInputKeys（表单行序与数据键序解耦）', () => {
  const contract = ['modelName', 'apiKey', 'apiHost', 'temperature', 'systemPrompt', 'prompt'];

  it('后端 JSONObject 打乱的键序按契约顺序排回', () => {
    const scrambled = ['apiKey', 'apiHost', 'modelName', 'systemPrompt', 'temperature', 'prompt'];
    expect(orderInputKeys(scrambled, contract)).toEqual(contract);
  });

  it('契约之外的键保持原相对顺序追加在后；契约里缺席的键不凭空出现', () => {
    expect(orderInputKeys(['zeta', 'prompt', 'alpha', 'modelName'], contract)).toEqual([
      'modelName',
      'prompt',
      'zeta',
      'alpha',
    ]);
  });

  it('未给顺序时原样返回', () => {
    const keys = ['b', 'a'];
    expect(orderInputKeys(keys)).toBe(keys);
    expect(orderInputKeys(keys, [])).toBe(keys);
  });
});
