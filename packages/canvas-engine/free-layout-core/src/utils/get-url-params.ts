/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export function getUrlParams(): Record<string, string> {
  const paramsMap = new Map<string, string>();

  location.search
    .replace(/^\?/, '')
    .split('&')
    .forEach((key) => {
      if (!key) return;

      const [k, v] = key.split('=');

      if (k) {
        // Decode URL-encoded parameter names and values
        const decodedKey = decodeURIComponent(k.trim());
        const decodedValue = v ? decodeURIComponent(v.trim()) : '';

        // Prevent prototype pollution by filtering dangerous property names
        const dangerousProps = [
          '__proto__',
          'constructor',
          'prototype',
          '__defineGetter__',
          '__defineSetter__',
          '__lookupGetter__',
          '__lookupSetter__',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'toString',
          'valueOf',
          'toLocaleString',
        ];

        if (dangerousProps.includes(decodedKey.toLowerCase())) {
          return;
        }

        // Use Map to prevent prototype pollution
        paramsMap.set(decodedKey, decodedValue);
      }
    });

  // Convert Map to plain object while maintaining API compatibility
  return Object.fromEntries(paramsMap);
}
