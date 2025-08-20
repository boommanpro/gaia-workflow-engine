/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

type RequestFn = (...args: any[]) => Promise<any>;

/**
 * 请求缓存
 * @param req
 */
// eslint-disable-next-line import/no-mutable-exports
export const RequestCache = new Map<any, Promise<any>>();
const CACHE_TIME = 10000; // 缓存过期时间

export function clearRequestCache(): void {
  RequestCache.clear();
}

export function requestWithMemo(
  req: RequestFn,
  cacheTime = CACHE_TIME,
  createCacheKey?: (...args: any[]) => any,
): RequestFn {
  return (...args: any[]) => {
    const cacheKey = createCacheKey ? createCacheKey(...args) : req;
    if (RequestCache.has(cacheKey)) {
      return Promise.resolve(RequestCache.get(cacheKey));
    }
    const result = req(...args);
    const time = setTimeout(() => RequestCache.delete(cacheKey), cacheTime);
    const withErrorResult = result.catch(e => {
      // 请求错误情况下不缓存
      RequestCache.delete(cacheKey);
      clearTimeout(time);
      throw e;
    });
    RequestCache.set(cacheKey, withErrorResult);
    return withErrorResult;
  };
}
