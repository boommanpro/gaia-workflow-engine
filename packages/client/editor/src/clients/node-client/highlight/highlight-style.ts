/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export const HIGHLIGHT_CLASSNAME = 'flowide-highlight';

const styleText = `
@keyframes flowide-fade {
  from {
   opacity: 1.0;
  }
  to {
    opacity: 0;
  }
}
@-webkit-keyframes flowide-fade {
  from {
   opacity: 1.0;
  }
  to {
    opacity: 0;
  }
}
.${HIGHLIGHT_CLASSNAME} {
  background-color: rgba(238, 245, 40, 0.5);
  animation: flowide-fade 2s 1 forwards;
  -webkit-animation: flowide-fade 2s 1 forwards;
}
`;

let styleDom: HTMLStyleElement | undefined;

export function createHighlightStyle(): void {
  if (styleDom) return;
  styleDom = document.createElement('style');
  styleDom.innerHTML = styleText;
  document.head.appendChild(styleDom);
}

export function removeHighlightStyle(): void {
  styleDom?.remove();
  styleDom = undefined;
}
