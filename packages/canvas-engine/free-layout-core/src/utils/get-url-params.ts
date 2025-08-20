/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export function getUrlParams(): Record<string, string> {
  return location.search
    .replace(/^\?/, '')
    .split('&')
    .reduce((res: Record<string, string>, key) => {
      const [k, v] = key.split('=');
      res[k] = v;
      return res;
    }, {} satisfies Record<string, string>);
}
