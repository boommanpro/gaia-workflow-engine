/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

const { keys } = Object;
export function deepFreeze<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  const stack: any[] = [obj];
  while (stack.length > 0) {
    const objectToFreeze = stack.shift();
    Object.freeze(objectToFreeze);
    for (const key in objectToFreeze) {
      if (_hasOwnProperty.call(objectToFreeze, key)) {
        const prop = objectToFreeze[key];
        if (typeof prop === 'object' && !Object.isFrozen(prop)) {
          stack.push(prop);
        }
      }
    }
  }
  return obj;
}

const _hasOwnProperty = Object.prototype.hasOwnProperty;

export function notEmpty<T>(arg: T | undefined | null): arg is T {
  return arg !== undefined && arg !== null;
}

/**
 * `true` if the argument is an empty object. Otherwise, `false`.
 */
export function isEmpty(arg: Object): boolean {
  return keys(arg).length === 0 && arg.constructor === Object;
}

export const each = <T = any, K = string>(obj: any, fn: (value: T, key: K) => void) =>
  keys(obj).forEach(key => fn(obj[key], key as any));

export const values = (obj: any) =>
  Object.values ? Object.values(obj) : keys(obj).map(k => obj[k]);

export const filter = (obj: any, fn: (value: any, key: string) => boolean, dest?: any) =>
  keys(obj).reduce(
    (output, key) => (fn(obj[key], key) ? Object.assign(output, { [key]: obj[key] }) : output),
    dest || {},
  );

export const pick = (obj: any, fields: string[], dest?: any) =>
  filter(obj, (n, k) => fields.indexOf(k) !== -1, dest);

export const omit = (obj: any, fields: string[], dest?: any) =>
  filter(obj, (n, k) => fields.indexOf(k) === -1, dest);

export const reduce = <V = any, R = any>(
  obj: any,
  fn: (res: R, value: V, key: string) => any,
  res: R = {} as R,
) => keys(obj).reduce((r, k) => fn(r, obj[k], k), res);

export const mapValues = <V = any>(obj: any, fn: (value: V, key: string) => any) =>
  reduce<V>(obj, (res, value, key) => Object.assign(res, { [key]: fn(value, key) }));

export const mapKeys = <V = any>(obj: any, fn: (value: V, key: string) => any) =>
  reduce<V>(obj, (res, value, key) => Object.assign(res, { [fn(value, key)]: value }));

/**
 * @param target
 * @param key
 * @example
 *  const obj = {
 *    position: {
 *      x: 0
 *      y: 0
 *    }
 *  }
 *  getByKey(ob, 'position.x') // 0
 */
export function getByKey(target: any, key: string): any | undefined {
  if (typeof target !== 'object' || !key) return undefined;
  return key.split('.').reduce((v: any, k: string) => {
    if (typeof v !== 'object') return undefined;
    return v[k];
  }, target);
}

/**
 * @param target
 * @param key
 * @param newValue
 * @param autoCreateObject
 * @example
 *  const obj = {
 *    position: {
 *      x: 0
 *      y: 0
 *    }
 *  }
 *  setByKey(ob, 'position.x', 100) // true
 *  setByKey(obj, 'size.width', 100) // false
 *  setBeyKey(obj, 'size.width', 100, true) // true
 */
export function setByKey(
  target: any,
  key: string,
  newValue: any,
  autoCreateObject = true,
  clone = false,
): any {
  if (typeof target !== 'object' || !key) return target;
  if (clone) {
    target = { ...target };
  }
  const originTarget = target;
  const targetKeys = key.split('.');
  while (targetKeys.length > 0) {
    key = targetKeys.shift()!;
    if (targetKeys.length === 0) {
      target[key] = newValue;
      return originTarget;
    }
    if (typeof target[key] !== 'object') {
      if (!autoCreateObject) return originTarget;
      target[key] = {};
    }
    if (clone) {
      if (Array.isArray(target[key])) {
        target[key] = target[key].slice();
      } else {
        target[key] = { ...target[key] };
      }
    }
    target = target[key];
  }
  return originTarget;
}

export const NOOP = () => {};

/**
 * @param obj The object to inspect.
 * @returns True if the argument appears to be a plain object.
 */
export function isPlainObject(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null) return false;

  let proto = obj;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }

  return Object.getPrototypeOf(obj) === proto;
}
