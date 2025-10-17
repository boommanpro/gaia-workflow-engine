/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import * as ReactDOM from 'react-dom';

export interface IPolyfillRoot {
  render(children: React.ReactNode): void;
  unmount(): void;
}

/**
 * React 18 polyfill
 * @param dom
 * @returns
 */
let unstableCreateRoot = (dom: HTMLElement): IPolyfillRoot => ({
  render(children: JSX.Element) {
    ReactDOM.render(children, dom);
  },
  unmount() {
    ReactDOM.unmountComponentAtNode(dom);
  },
});

export function polyfillCreateRoot(dom: HTMLElement): IPolyfillRoot {
  return unstableCreateRoot(dom);
}

export function unstableSetCreateRoot(createRoot: (dom: HTMLElement) => IPolyfillRoot) {
  unstableCreateRoot = createRoot;
}
