/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export type Area = 'right' | 'bottom';

export interface PanelConfig {
  /** max panel */
  max: number;
}

export interface PanelFactory<T extends any> {
  key: string;
  defaultSize: number;
  style?: React.CSSProperties;
  render: (props: T) => React.ReactNode;
}
