/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IconButton, Tooltip } from '@douyinfe/semi-ui';
import { IconExpand } from '@douyinfe/semi-icons';

export const FitView = (props: { fitView: () => void }) => (
  <Tooltip content="FitView">
    <IconButton
      icon={<IconExpand />}
      type="tertiary"
      theme="borderless"
      onClick={() => props.fitView()}
    />
  </Tooltip>
);
