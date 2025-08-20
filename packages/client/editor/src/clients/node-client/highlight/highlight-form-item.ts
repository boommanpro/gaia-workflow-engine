/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FormItem } from '@flowgram.ai/form-core';
import { FlowNodeRenderData } from '@flowgram.ai/document';

import { HIGHLIGHT_CLASSNAME } from './highlight-style';
import { DEFAULT_HIGHLIGHT_PADDING } from './constants';

export interface HighLightOptions {
  padding?: number;
  overlayClassName?: string;
}

export function highlightFormItem(
  formItem: FormItem,
  options?: HighLightOptions,
): HTMLDivElement | undefined {
  const parent =
    formItem.formModel.flowNodeEntity.getData<FlowNodeRenderData>(FlowNodeRenderData).node;
  const target = formItem.domRef.current;

  if (!target) {
    return undefined;
  }

  const overlay = document.createElement('div');

  const { padding = DEFAULT_HIGHLIGHT_PADDING, overlayClassName } = options || {};

  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.zIndex = '9999';

  parent.appendChild(overlay);

  const parentRect = parent.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  overlay.style.top = targetRect.top - parentRect.top - padding + 'px';
  overlay.style.left = targetRect.left - parentRect.left - padding + 'px';
  overlay.style.width = targetRect.width + padding * 2 + 'px';
  overlay.style.height = targetRect.height + padding * 2 + 'px';

  overlay.className = overlayClassName || HIGHLIGHT_CLASSNAME;
  setTimeout(() => {
    overlay.remove();
  }, 2000);
  return overlay;
}
