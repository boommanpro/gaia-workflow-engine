/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';
import { type FlowNodeTransformData } from '@flowgram.ai/document';
import { Disposable } from '@flowgram.ai/utils';

import { isHidden, isRectInit } from './utils/element';

/**
 * 监听 dom 元素的 size 变化，用于画布节点的大小变化重新计算
 */
@injectable()
export class FlowRendererResizeObserver {
  /**
   * 监听元素 size，并同步到 transform
   * @param el
   * @param transform
   */
  observe(el: HTMLElement, transform: FlowNodeTransformData): Disposable {
    const observer = new ResizeObserver(entries => {
      /**
       * NOTICE: 不加 window.requestAnimationFrame
       * 会导致 "ResizeObserver loop completed with undelivered notifications." 报错
       * 这个报错在 chrome 和 firefox 是默认被忽略的，但本地调试会被编译工具弹窗打断
       */
      window.requestAnimationFrame(() => {
        if (!Array.isArray(entries) || !entries.length) {
          return;
        }
        const entry = entries[0];
        const { contentRect, target } = entry;
        // 元素宽高未计算时，不更新节点 size
        const isContentRectInit = isRectInit(contentRect);
        // 目标节点脱离 DOM 树，忽略本次变更
        const isLeaveDOMTree = !target.parentNode;
        // IDE 环境下画布元素可能 display none，这时候会监听到元素宽高 0 导致闪屏
        // 此情况下不作 resize 重渲染
        const isHiddenElement = isHidden(target.parentNode as HTMLElement);
        if (isContentRectInit && !isLeaveDOMTree && !isHiddenElement) {
          // 更新节点 size 数据
          transform.size = {
            width: Math.round(contentRect.width * 10) / 10,
            height: Math.round(contentRect.height * 10) / 10,
          };
        }
      });
    });
    observer.observe(el);
    return Disposable.create(() => {
      observer.unobserve(el);
    });
  }
}
