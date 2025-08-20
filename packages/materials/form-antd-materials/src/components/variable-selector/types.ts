/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { ReactElement } from 'react';

export interface TreeNodeData<VariableMeta = any> {
  value: string | number;
  title: string;
  disabled?: boolean;
  disableCheckbox?: boolean;
  selectable?: boolean;
  checkable?: boolean;
  children?: TreeNodeData[];
  icon: ReactElement;
  key: string;
  keyPath: string[];
  rootMeta: VariableMeta;
}
