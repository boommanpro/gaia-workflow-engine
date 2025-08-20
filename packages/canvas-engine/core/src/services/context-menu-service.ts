/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';

/**
 * 圈选右键菜单相关 service
 */
@injectable()
export class ContextMenuService {
  /**
   * 右键面板是否展示，展示的时候为 true
   */
  private isRightPanelVisible: boolean;

  get rightPanelVisible(): boolean {
    return this.isRightPanelVisible;
  }

  set rightPanelVisible(visible: boolean) {
    this.isRightPanelVisible = visible;
  }
}
