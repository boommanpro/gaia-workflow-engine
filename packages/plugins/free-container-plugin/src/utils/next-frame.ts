/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export const nextFrame = async (): Promise<void> => {
  await new Promise((resolve) => requestAnimationFrame(resolve));
};
