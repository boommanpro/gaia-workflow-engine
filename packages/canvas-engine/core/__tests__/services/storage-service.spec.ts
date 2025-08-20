/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, beforeEach, it, expect, vi } from 'vitest';

import { LocalStorageService, StorageService } from '../../src/services';
import { createPlaygroundContainer } from '../../src';

describe('LocalStorageService', () => {
  beforeEach(() => {});
  it('storage-service set get data', () => {
    const container = createPlaygroundContainer();
    const service: LocalStorageService = container.get(StorageService);

    service.setData('key1', 'value1');
    expect(service.getData('key1')).toEqual('value1');
    expect(service.getData('key2', 'defaultValue')).toEqual('defaultValue');
    const MOCK_PREFIX = '_test_prefix';
    service.setPrefix(MOCK_PREFIX);
    const MOCK_KEY = '123';
    expect(service.prefix(MOCK_KEY)).toEqual(`${MOCK_PREFIX}${MOCK_KEY}`);
  });

  it('window undefined', () => {
    const container = createPlaygroundContainer();

    // 触发一次 postConstruct
    vi.stubGlobal('window', undefined);
    const service: LocalStorageService = container.get(StorageService);

    // 赋值为 {} 正常使用
    service.setData('key1', 'value1');
    expect(service.getData('key1')).toEqual('value1');
  });
});
