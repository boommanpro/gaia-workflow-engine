/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

declare module '*.svg'
declare module '*.png'
declare module '*.jpg'
declare module '*.module.less'

// wujie micro-frontend bus injected on window
interface Window {
  $wujie?: {
    bus: {
      $on: (event: string, handler: (...args: any[]) => void) => void;
      $off: (event: string, handler?: (...args: any[]) => void) => void;
      $emit: (event: string, ...args: any[]) => void;
    };
    props?: any;
  };
}

// Allow importing .tsx files with explicit extension
declare module '*.tsx'
