/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { renderHook } from '@testing-library/react-hooks';

import { createDocument, createHookWrapper } from '../mocks';
import { useCurrentDomNode } from '../../src';

it('use-current-dom-node', async () => {
  const { container } = await createDocument();
  const wrapper = createHookWrapper(container);
  const { result } = renderHook(() => useCurrentDomNode(), {
    wrapper,
  });
  expect(result.current.tagName).toEqual('DIV');
});
