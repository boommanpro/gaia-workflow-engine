/**
 * useStableActivity 稳定活动标签契约测试（jsdom + 假时钟）：
 *  · 最小停留：停留期内连发的新活动不切换显示（防闪烁）
 *  · last-wins：到期一次性提交最新候选（中间活动可整段跳过）
 *  · 直通：清空（run 结束）与 immediate 活动（等待作答）立即生效
 *  · 同键文案微变（聚合计数）跟随更新，不占用切换窗口
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';

import { useStableActivity, type ActivityLabel } from '../use-stable-activity';

const tool = (name: string): ActivityLabel => ({ key: `tool:${name}`, label: `调用 ${name}` });

let container: HTMLElement;
let root: Root;

function Probe({ raw }: { raw: ActivityLabel | undefined }) {
  const label = useStableActivity(raw);
  return <div data-testid="label">{label ?? ''}</div>;
}

const render = (raw: ActivityLabel | undefined) => {
  act(() => {
    root.render(<Probe raw={raw} />);
  });
};
const text = () => container.textContent || '';

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe('useStableActivity：最小停留 + last-wins', () => {
  it('停留期内连发不切换；到期提交最新（中间活动整段跳过）', () => {
    render(tool('get'));
    expect(text()).toBe('调用 get');

    render(tool('node')); // +0.1s，停留期内
    act(() => { vi.advanceTimersByTime(100); });
    render(tool('edge')); // +0.2s，仍在停留期内
    expect(text()).toBe('调用 get'); // 未闪烁

    act(() => { vi.advanceTimersByTime(1500); }); // 停留期满，提交最新候选
    expect(text()).toBe('调用 edge'); // node 被整段跳过
  });

  it('停留期满后的新活动立即切换', () => {
    render(tool('get'));
    act(() => { vi.advanceTimersByTime(1600); });
    render(tool('run'));
    expect(text()).toBe('调用 run');
  });

  it('immediate 活动（等待作答）直通，不受停留期约束', () => {
    render(tool('get'));
    act(() => { vi.advanceTimersByTime(100); });
    render({ key: 'wait', label: '等待你的回答', immediate: true });
    expect(text()).toBe('等待你的回答');
  });

  it('清空（run 结束）直通', () => {
    render(tool('get'));
    act(() => { vi.advanceTimersByTime(100); });
    render(undefined);
    expect(text()).toBe('');
  });

  it('同键文案微变（聚合计数 +1）跟随更新，不触发切换窗口', () => {
    render({ key: 'tool-burst', label: '连续调用工具 · 3 个' });
    act(() => { vi.advanceTimersByTime(200); });
    render({ key: 'tool-burst', label: '连续调用工具 · 4 个' });
    expect(text()).toBe('连续调用工具 · 4 个');
  });
});
