/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { renderHook } from '@testing-library/react-hooks';
import { PlaygroundConfigEntity } from '@flowgram.ai/core';

import { createDocument, createHookWrapper } from '../mocks';
import { usePlaygroundReadonlyState } from '../../src';

describe('use-workflow-document', () => {
  it('base', async () => {
    const { container } = await createDocument();
    const wrapper = createHookWrapper(container);
    const { result } = renderHook(() => usePlaygroundReadonlyState(), {
      wrapper,
    });
    expect(result.current).toEqual(false);
    container.get<PlaygroundConfigEntity>(PlaygroundConfigEntity).readonly = true;
    // 没有监听不会更新
    expect(result.current).toEqual(false);
  });
  it('listen change', async () => {
    const { container } = await createDocument();
    const wrapper = createHookWrapper(container);
    const { result } = renderHook(() => usePlaygroundReadonlyState(true), {
      wrapper,
    });
    expect(result.current).toEqual(false);
    container.get<PlaygroundConfigEntity>(PlaygroundConfigEntity).readonly = true;
    expect(result.current).toEqual(true);
  });
});
