/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { MinimapRender } from '@flowgram.ai/minimap-plugin';

export const Minimap = () => (
  <div
    style={{
      position: 'absolute',
      left: 16,
      bottom: 72,
      zIndex: 100,
      width: 118,
    }}
  >
    <MinimapRender
      containerStyles={{
        pointerEvents: 'auto',
        position: 'relative',
        top: 'unset',
        right: 'unset',
        bottom: 'unset',
        left: 'unset',
      }}
      inactiveStyle={{
        opacity: 1,
        scale: 1,
        translateX: 0,
        translateY: 0,
      }}
    />
  </div>
);
