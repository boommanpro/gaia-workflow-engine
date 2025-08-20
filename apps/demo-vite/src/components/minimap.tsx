/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowMinimapService, MinimapRender } from '@flowgram.ai/minimap-plugin';
import { useService } from '@flowgram.ai/free-layout-editor';

export const Minimap = () => {
  const minimapService = useService(FlowMinimapService);
  return (
    <div
      style={{
        position: 'absolute',
        left: 226,
        bottom: 51,
        zIndex: 100,
        width: 198,
      }}
    >
      <MinimapRender
        service={minimapService}
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
};
