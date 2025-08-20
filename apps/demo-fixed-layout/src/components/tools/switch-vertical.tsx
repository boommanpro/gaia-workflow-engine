/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { usePlaygroundTools } from '@flowgram.ai/fixed-layout-editor';
import { Button, Tooltip } from '@douyinfe/semi-ui';
import { IconServer } from '@douyinfe/semi-icons';

export const SwitchVertical = () => {
  const tools = usePlaygroundTools();
  return (
    <Tooltip content={!tools.isVertical ? 'Vertical Layout' : 'Horizontal Layout'}>
      <Button
        theme="borderless"
        size="small"
        onClick={() => tools.changeLayout()}
        icon={
          <IconServer
            style={{
              transform: !tools.isVertical ? '' : 'rotate(90deg)',
              transition: 'transform .3s ease',
            }}
          />
        }
        type="tertiary"
      />
    </Tooltip>
  );
};
