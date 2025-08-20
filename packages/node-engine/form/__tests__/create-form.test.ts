/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';

import { createForm } from '@/core/create-form';

describe('createForm', () => {
  it('should disableAutoInit work', async () => {
    const { control } = createForm({ disableAutoInit: true });

    expect(control._formModel.initialized).toBe(false);

    control.init();
    expect(control._formModel.initialized).toBe(true);
  });
});
