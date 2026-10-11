/**
 * 对话 UI 回放 E2E —— 四个确定性场景（mock 驱动，零 LLM）：
 *
 *  1. thinking-boundary：已完成思考块在工具入场后必须停止 shimmer（闪烁回归钉子）
 *  2. snapshot-race：流式中刷新页面，终态收敛、无重复工具行（刷新一致性钉子）
 *  3. interrupted：中断后部分正文与系统通知保留
 *  4. long-echo：长流式跑完落定（渲染稳定性冒烟）
 */
import { expect, test } from '@playwright/test';

const shimmerSel = '.dsh-shimmer';

test.describe('回放模式对话 UI', () => {
  test('思考边界收敛：工具入场后已完成思考块停止 shimmer', async ({ page }) => {
    await page.goto('/chat?replay=thinking-boundary&replaySpeed=8');

    // 思考阶段：恰好一个 shimmer（正在流式的思考块）
    await expect(page.locator(shimmerSel)).toHaveCount(1, { timeout: 15_000 });

    // tool_call 到达后：思考块 closed（不再闪），shimmer 只属于运行中的工具行
    await expect(page.getByText('read_workflow', { exact: true })).toBeVisible();
    await expect(page.locator(shimmerSel)).toHaveCount(1);
    const shimmerInThinking = page.locator('button', { hasText: '思考' }).locator(shimmerSel);
    await expect(shimmerInThinking).toHaveCount(0);

    // tool_result + 正文阶段：无任何 shimmer
    await expect(page.getByText('节点配置没有问题')).toBeVisible();
    await expect(page.locator(shimmerSel)).toHaveCount(0);

    // done 落位：历史重建后全文可见、无 shimmer
    await expect(page.locator(shimmerSel)).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByText('整体结构是「开始 → LLM → 结束」')).toBeVisible();
  });

  test('流式中刷新：终态收敛、工具行不重复', async ({ page }) => {
    await page.goto('/chat?replay=snapshot-race&replaySpeed=8');
    await expect(page.getByText('已经在画布右侧加入')).toBeVisible({ timeout: 15_000 });

    // 流式中刷新：订阅快照（running + timeline）先于历史返回的竞态现场
    await page.reload();
    await expect(page.getByText('参数用默认 GET')).toBeVisible({ timeout: 15_000 });

    // 终态收敛：回复正文渲染且唯一；工具行只有一张
    await expect(page.getByText('HTTP 节点并连好线')).toHaveCount(1);
    await expect(page.locator('.dsh-tool-row')).toHaveCount(1);
    await expect(page.locator(shimmerSel)).toHaveCount(0);
  });

  test('中断收敛：部分正文与中断通知保留', async ({ page }) => {
    await page.goto('/chat?replay=interrupted&replaySpeed=8');

    await expect(page.getByText('1. 目标人群定位')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('已被中断')).toBeVisible();
    // 中断通知进入时间线，全部条目停止流式态
    await expect(page.locator(shimmerSel)).toHaveCount(0);
  });

  test('长流式压测：跑完落定不崩页', async ({ page }) => {
    await page.goto('/chat?replay=long-echo&replaySpeed=16');

    await expect(page.getByText('如需进一步调整语气')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(shimmerSel)).toHaveCount(0);
    // 页面仍可交互（发送框存在即 UI 树完整）
    await expect(page.locator('textarea, [contenteditable="true"]').first()).toBeAttached();
  });
});
