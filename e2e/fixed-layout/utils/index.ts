/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { Locator } from '@playwright/test';

/**
 * @param {import('@playwright/test').Locator} locator
 */
export async function getOffsetByLocator(locator: Locator) {
  return locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const left = rect.left;
    const top = rect.top;
    const width = rect.width;
    const height = rect.height;

    return {
      left,
      top,
      width,
      height,
      centerX: left + width / 2,
      centerY: top + height / 2,
      right: left + width,
      bottom: top + height,
    };
  });
}

export function cssEscape(str: string) {
  return str.replace(/([ !"#$%&'()*+,.\/:;<=>?@[\]^`{|}~])/g, '\\$1');
}
