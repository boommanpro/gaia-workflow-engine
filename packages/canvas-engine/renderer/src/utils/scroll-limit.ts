/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Rectangle } from '@flowgram.ai/utils';
import { type PlaygroundConfigEntity } from '@flowgram.ai/core';

export interface ScrollData {
  scrollX: number;
  scrollY: number;
}

// viewport 缩小 30 像素
const SCROLL_LIMIT_PADDING = -120;

export function getScrollViewport(
  scrollData: ScrollData,
  config: PlaygroundConfigEntity
): Rectangle {
  const scale = config.finalScale;
  return new Rectangle(
    scrollData.scrollX / scale,
    scrollData.scrollY / scale,
    config.config.width / scale,
    config.config.height / scale
  ).pad(SCROLL_LIMIT_PADDING / scale, SCROLL_LIMIT_PADDING / scale);
}

/**
 * 限制滚动
 */
export function scrollLimit(
  scroll: ScrollData,
  boundsList: Rectangle[],
  config: PlaygroundConfigEntity,
  initScroll: () => ScrollData
): ScrollData {
  scroll = { ...scroll };
  const configData = config.config;
  const oldScroll = { scrollX: configData.scrollX, scrollY: configData.scrollY };
  // 画布 size 还没初始化滚动不限制
  if (boundsList.length === 0 || configData.width === 0 || configData.height === 0) return scroll;
  const viewport = getScrollViewport(scroll, config);
  const isVisible = boundsList.find((bounds) => Rectangle.isViewportVisible(bounds, viewport));
  if (!isVisible) {
    const oldViewport = getScrollViewport(oldScroll, config);
    const isOldVisible = boundsList.find((bounds) =>
      Rectangle.isViewportVisible(bounds, oldViewport)
    );
    // 如果之前也是不可见就不阻止
    if (!isOldVisible) {
      return initScroll();
    }
    return oldScroll;
  }
  return scroll;
}
