/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { renderHook } from '@testing-library/react-hooks';

import { createDocument, createHookWrapper } from '../mocks';
import { useCurrentEntity } from '../../src';

it('use-current-entity', async () => {
  const { container } = await createDocument();
  const wrapper = createHookWrapper(container);
  const { result } = renderHook(() => useCurrentEntity(), {
    wrapper,
  });
  expect(result.current.id).toEqual('start_0');
});
