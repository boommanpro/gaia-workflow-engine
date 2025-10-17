/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { Page } from '@playwright/test';

import type { DragPosition } from '../typings/index';

type InsertEdgeOptions = {
  from: string;
  to: string;
};

class FixedLayoutModel {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async getNodeCount() {
    return await this.page.locator('.gedit-flow-activity-node').count();
  }

  public async isStartNodeExist() {
    return await this.page.locator('[data-node-id="start_0"]').count();
  }

  public async isEndNodeExist() {
    return await this.page.locator('[data-node-id="end_0"]').count();
  }

  public async isConditionNodeExist() {
    return await this.page.locator('[data-node-id="$blockIcon$switch_0"]').count();
  }

  public async drag(from: DragPosition, to: DragPosition) {
    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    await this.page.mouse.move(to.x, to.y);
    await this.page.mouse.up();
  }

  public async insert(searchText: string, { from, to }: InsertEdgeOptions) {
    const preConditionNodes = await this.page.locator('.gedit-flow-activity-node');
    const preCount = await preConditionNodes.count();
    const element = await this.page.locator(
      `[data-testid="sdk.flowcanvas.line.adder"][data-from="${from}"][data-to="${to}"]`
    );

    await element.waitFor({ state: 'visible' });
    await element.scrollIntoViewIfNeeded();
    await element.hover({
      timeout: 3000,
    });
    const adder = this.page.locator('.semi-icon-plus_circle');

    await adder.waitFor({ state: 'visible', timeout: 3000 });
    await adder.scrollIntoViewIfNeeded();
    await adder.click();
    const nodeItem = await this.page.locator('.semi-popover-content').getByText(searchText);
    await nodeItem.click();

    await this.page.waitForFunction(
      (expectedCount) =>
        document.querySelectorAll('.gedit-flow-activity-node').length >= expectedCount,
      preCount + 1
    );
  }
}

export default FixedLayoutModel;
