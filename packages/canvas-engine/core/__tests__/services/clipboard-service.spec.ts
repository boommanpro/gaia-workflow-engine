/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, beforeEach, it, expect, vi } from 'vitest';

import { DefaultClipboardService } from '../../src/services';

describe('ClipboardService', () => {
  beforeEach(() => {});
  it('base', () => {
    const service = new DefaultClipboardService();
    const onChange = vi.fn();
    service.onClipboardChanged(onChange);
    service.writeText('abc');
    expect(service.readText()).toEqual('abc');
    expect(onChange.mock.calls).toEqual([['abc']]);
    service.writeText('abc');
    expect(onChange.mock.calls).toEqual([['abc']]);
    service.writeText('abc2'); // no change
    expect(onChange.mock.calls).toEqual([['abc'], ['abc2']]);
  });
});
