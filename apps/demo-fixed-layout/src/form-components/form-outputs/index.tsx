/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { DisplayOutputs } from '@flowgram.ai/form-materials';

import { useIsSidebar } from '../../hooks';

export function FormOutputs() {
  const isSidebar = useIsSidebar();
  if (isSidebar) {
    return null;
  }
  return <DisplayOutputs displayFromScope />;
}
