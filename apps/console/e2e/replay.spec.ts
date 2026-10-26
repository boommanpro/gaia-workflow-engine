/**
 * 对话 UI 回放 E2E —— 确定性场景（mock 驱动，零 LLM）。
 *
 * 断言原则：只断稳定终态（done 收敛后的历史视图），流式瞬态交给 vitest 渲染测试
 * （live-timeline.render.test：shimmer 边界的钉子在那边，粒度更准也不抖）。
 * e2e 在这里验收「整条链路 + 页面存活」：回放驱动 → SSE 帧分发 → runtime → 渲染 → 收敛。
 *
 *  1. thinking-boundary：run 落定后过程可展开、无闪烁残留、无重复工具行
 *  2. snapshot-race：流式中刷新页面，终态收敛、工具行不重复（刷新一致性钉子）
 *  3. interrupted：中断后部分正文与中断通知保留
 *  4. long-echo：长流式跑完落定不崩页（渲染稳定性冒烟）
 *  5. plan-regression：plan 事件（todo_write）不冻死页面（P0 死循环钉子，2026-10-24）
 */
import { expect, test, type Page } from '@playwright/test';

const shimmerSel = '.dsh-shimmer';

/** 展开「任务耗时」折叠行（过程项默认收起是产品语义；存在才点，幂等） */
async function expandTaskCollapse(page: Page): Promise<void> {
  const btn = page.locator('button[aria-expanded="false"]', { hasText: /任务耗时|执行过程/ }).last();
  const count = await btn.count();
  if (count > 0) await btn.click();
}

test.describe('回放模式对话 UI', () => {
  test('run 落定：过程可展开、无闪烁残留、工具行唯一', async ({ page }) => {
    await page.goto('/chat?replay=thinking-boundary&replaySpeed=8');

    // done 收敛：历史重建后全文可见
    await expect(page.getByText('整体结构是「开始 → LLM → 结束」')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(shimmerSel)).toHaveCount(0);

    // 展开过程折叠：思考行与工具行可见且唯一（无闪烁残留）
    await expandTaskCollapse(page);
    await expect(page.getByText('read_workflow', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.dsh-tool-row')).toHaveCount(1);
    await expect(page.locator(shimmerSel)).toHaveCount(0);
  });

  test('流式中刷新：终态收敛、工具行不重复', async ({ page }) => {
    await page.goto('/chat?replay=snapshot-race&replaySpeed=8');
    await expect(page.getByText('已经在画布右侧加入')).toBeVisible({ timeout: 15_000 });

    // 流式中刷新：订阅快照（running + timeline）先于历史返回的竞态现场
    await page.reload();
    await expect(page.getByText('参数用默认 GET')).toBeVisible({ timeout: 15_000 });

    // 终态收敛：回复正文渲染且唯一
    await expect(page.getByText('HTTP 节点并连好线')).toHaveCount(1);
    await expect(page.locator(shimmerSel)).toHaveCount(0);
    // 展开过程：工具行只有一张（快照回放 + 历史重建不得双写）
    await expandTaskCollapse(page);
    await expect(page.locator('.dsh-tool-row')).toHaveCount(1);
  });

  test('中断收敛：部分正文与中断通知保留', async ({ page }) => {
    await page.goto('/chat?replay=interrupted&replaySpeed=8');

    // 正文里 "1. " 被渲染为有序列表标记（非文本节点），断言用无标记文本
    await expect(page.getByText('目标人群定位')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('已被中断')).toBeVisible();
    await expect(page.locator(shimmerSel)).toHaveCount(0);
  });

  test('长流式压测：跑完落定不崩页', async ({ page }) => {
    await page.goto('/chat?replay=long-echo&replaySpeed=16');

    await expect(page.getByText('如需进一步调整语气')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(shimmerSel)).toHaveCount(0);
    // 页面仍可交互（发送框存在即 UI 树完整）
    await expect(page.locator('textarea, [contenteditable="true"]').first()).toBeAttached();
  });

  test('plan 行回归：todo_write 事件不冻死页面（P0 死循环钉子）', async ({ page }) => {
    await page.goto('/chat?replay=plan-regression&replaySpeed=8');

    // 尽力复现事故操作：流式中展开「任务耗时」（按钮尚在才点，不与瞬态赛跑）
    await expandTaskCollapse(page).catch(() => { /* live 窗口极短时跳过，终态断言兜底 */ });

    // done 收敛：历史重建后正文可见（plan 事件曾让这一步永远到不了 —— 主线程死循环）
    await expect(page.getByText('已列出 3 步清单并开始执行。')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(shimmerSel)).toHaveCount(0);

    // 展开过程：两张工具行（skill + node），todo 步骤行被 hidePlanCards 隐藏但循环正常完成
    await expandTaskCollapse(page);
    await expect(page.locator('.dsh-tool-row')).toHaveCount(2);

    // 输入框仍可交互（死循环时整个主线程冻死，任何断言都会超时）
    await expect(page.locator('textarea').first()).toBeEnabled();
  });
});
