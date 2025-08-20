/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useCallback } from 'react';

import { usePlayground } from '@flowgram.ai/fixed-layout-editor';
import { IconButton } from '@douyinfe/semi-ui';
import { IconUnlock, IconLock } from '@douyinfe/semi-icons';

export const Readonly = () => {
  const playground = usePlayground();
  const toggleReadonly = useCallback(() => {
    playground.config.readonly = !playground.config.readonly;
  }, [playground]);

  return playground.config.readonly ? (
    <IconButton theme="borderless" type="tertiary" icon={<IconLock />} onClick={toggleReadonly} />
  ) : (
    <IconButton theme="borderless" type="tertiary" icon={<IconUnlock />} onClick={toggleReadonly} />
  );
};
