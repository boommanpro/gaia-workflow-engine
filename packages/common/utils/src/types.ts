/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export interface AsClass<T> {
  new (...args: any[]): T;
}

type UnknownObject<T extends object> = Record<string | number | symbol, unknown> & {
  [K in keyof T]: unknown;
};

export function isObject<T extends object>(v: unknown): v is UnknownObject<T> {
  return typeof v === 'object' && v !== null;
}
export function isString(v: unknown): v is string {
  return typeof v === 'string' || v instanceof String;
}
export function isFunction<T extends (...args: unknown[]) => unknown>(v: unknown): v is T {
  return typeof v === 'function';
}
const toString = Object.prototype.toString;

export function getTag(v: unknown) {
  if (v == null) {
    return v === undefined ? '[object Undefined]' : '[object Null]';
  }
  return toString.call(v);
}
export function isNumber(v: unknown): v is number {
  return typeof v === 'number' || (isObject(v) && getTag(v) === '[object Number]');
}

export type MaybeArray<T> = T | T[];
export type MaybePromise<T> = T | PromiseLike<T>;

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer I>
    ? Array<RecursivePartial<I>>
    : RecursivePartial<T[P]>;
};
