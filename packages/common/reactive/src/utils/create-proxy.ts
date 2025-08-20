/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

interface ProxyOptions<V> {
  get?: (target: V, key: string) => any;
  set?: (target: V, key: string, newValue: any) => boolean;
}

export function createProxy<V extends Record<string, any>>(target: V, opts: ProxyOptions<V>): V {
  let useProxy = 'Proxy' in window;
  if (process.env.NODE_ENV === 'test') {
    if ((global as any).__ignoreProxy) {
      useProxy = false;
    }
  }
  if (useProxy) {
    return new Proxy<V>(target, opts);
  }
  const result: V = {} as V;
  for (const key in target) {
    Object.defineProperty(result, key, {
      enumerable: true,
      get: opts.get ? () => opts.get!(target, key) : undefined,
      set: opts.set ? (newValue: any) => opts.set!(target, key, newValue) : undefined,
    });
  }
  return result;
}
