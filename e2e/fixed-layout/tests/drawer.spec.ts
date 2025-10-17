/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from '@playwright/test';

import PageModel from './models';

test.describe('test llm drawer', () => {
  let editorPage: PageModel;

  test.beforeEach(async ({ page }) => {
    editorPage = new PageModel(page);
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);
  });

  test('sync data', async ({ page }) => {
    // 确保 llm drawer 更改表单数据，数据同步
    const LLM_NODE_ID = 'llm_0';
    const DRAWER_CLASSNAME = 'float-panel-wrap';

    const TEST_FILL_VALUE = '123';

    const llmLocator = await page.locator(`#${LLM_NODE_ID}`);

    await llmLocator.click();

    const drawerLocator = await page.locator(`.${DRAWER_CLASSNAME}`);
    expect(drawerLocator).toBeVisible();

    const input = await drawerLocator.locator('input').first();
    await input.fill(TEST_FILL_VALUE);

    const inputValue = await llmLocator.locator('input').first().inputValue();
    expect(inputValue).toEqual(TEST_FILL_VALUE);
  });
});
