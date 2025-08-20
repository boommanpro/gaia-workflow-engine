/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export enum EditorCursorState {
  GRAB = 'GRAB',
  SELECT = 'SELECT',
}

export enum InteractiveType {
  /** 鼠标优先交互模式 */
  MOUSE = 'MOUSE',

  /** 触控板优先交互模式 */
  PAD = 'PAD',
}
