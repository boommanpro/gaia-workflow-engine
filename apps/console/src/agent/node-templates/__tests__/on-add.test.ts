import { describe, expect, it, vi } from 'vitest';

import { cloneDefaultData } from '../index';
import { CodeNodeRegistry } from '../../../nodes/code';
import { ConditionNodeRegistry } from '../../../nodes/condition';

vi.mock('../../../nodes/code/form-meta', () => ({ formMeta: {} }));
vi.mock('../../../nodes/condition/form-meta', () => ({ formMeta: {} }));

describe('节点 onAdd 默认数据', () => {
  it.each([
    ['code', CodeNodeRegistry],
    ['condition', ConditionNodeRegistry],
  ] as const)('%s 使用共享默认数据并保留合法独立 ID', (type, registry) => {
    const onAdd = registry.onAdd as () => { id: string; type: string; data: Record<string, any> };
    const first = onAdd();
    const second = onAdd();
    const defaults = cloneDefaultData(type);
    expect(first.id).toMatch(new RegExp(`^${type}_[a-zA-Z_][a-zA-Z0-9_]{4}$`));
    expect(second.id).not.toBe(first.id);
    expect(first.type).toBe(type);
    expect(first.data).toEqual({ ...defaults, title: first.data.title });
    if (type === 'code') {
      expect(first.data.title).toMatch(/^Code_\d+$/);
      expect(second.data.title).not.toBe(first.data.title);
      first.data.script.content = 'changed';
    } else {
      expect(first.data.title).toBe(defaults.title);
      first.data.conditions.push({ key: 'changed', value: {} });
    }
    expect(second.data).toEqual({ ...defaults, title: second.data.title });
    expect(cloneDefaultData(type)).toEqual(defaults);
  });
});
