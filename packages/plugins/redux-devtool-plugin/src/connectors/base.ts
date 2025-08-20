/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable, postConstruct } from 'inversify';

/**
 * 参考：https://github.com/zalmoxisus/redux-devtools-extension/blob/master/docs/API/Methods.md
 */
@injectable()
export abstract class BaseConnector {
  devTools;

  abstract getName(): string;

  abstract getState(): any;

  abstract onInit(): any;

  constructor() {
    this.devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.connect({
      name: this.getName(),
    });
  }

  @postConstruct()
  init() {
    if (this.devTools) {
      this.devTools.init(this.getState());
      this.devTools.subscribe((_msg: any) => {
        // COMMIT 清空数据
        if (_msg?.payload?.type === 'COMMIT') {
          this.devTools.init(this.getState());
        }
      });
      this.onInit();
    }
  }

  protected send(action: any, state?: any) {
    if (this.devTools) {
      this.devTools.send(action, state || this.getState());
    }
  }
}
