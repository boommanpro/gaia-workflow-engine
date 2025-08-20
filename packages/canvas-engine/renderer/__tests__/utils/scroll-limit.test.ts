/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Rectangle } from '@flowgram.ai/utils';

import { scrollLimit } from '../../src/utils/scroll-limit';
import { createPlaygroundConfigEntity } from '../../__mocks__/renderer.mock';

test('scroll limit', () => {
  const config = createPlaygroundConfigEntity();
  config.updateConfig({
    width: 1668,
    height: 527,
    clientX: 60,
    clientY: 89,
    scrollX: 18,
    scrollY: -14,
  });
  const initScrollData = { scrollX: 100, scrollY: -100 };
  const res = scrollLimit(initScrollData, [new Rectangle(0, 0, 10, 10)], config, () => ({
    scrollX: config.config.scrollX,
    scrollY: config.config.scrollY,
  }));
  expect(res).toEqual({ scrollX: 18, scrollY: -14 });
});
