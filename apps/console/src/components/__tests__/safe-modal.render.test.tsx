/**
 * A1 回归钉子（safe-modal）：appConfirm 必须 motion:false。
 * 关闭动画去掉后 Semi 在 commit 里同步完成 onAnimationEnd，
 * 不再依赖 animationend 事件（遮罩残留竞态的根除层）。
 * jsdom 环境：Semi 的 canvas/ResizeObserver 依赖需要 stub，
 * 且 Semi 必须在 stub 就位后动态 import（静态 import 会被提升）。
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// jsdom 没有 canvas：Semi 的传递依赖在 import 阶段取 2d context，先补 stub
const ctxStub: any = new Proxy(
  {},
  {
    get: (_t, key) => (key === 'canvas' ? {} : () => ctxStub),
    set: () => true,
  }
);
(HTMLCanvasElement.prototype as any).getContext = () => ctxStub;
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = ResizeObserverStub;
}

describe('A1 appConfirm：确认框统一 motion=false', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('透传 motion:false，其余 props 原样保留', { timeout: 30_000 }, async () => {
    const { Modal } = await import('@douyinfe/semi-ui');
    const { appConfirm } = await import('../safe-modal');
    const spy = vi
      .spyOn(Modal, 'confirm')
      .mockImplementation(() => ({ destroy: () => {}, update: () => {} }) as any);
    appConfirm({ title: '删除', okType: 'danger', onOk: () => {} });
    expect(spy).toHaveBeenCalledTimes(1);
    const props = spy.mock.calls[0][0] as any;
    expect(props.motion).toBe(false);
    expect(props.title).toBe('删除');
    expect(props.okType).toBe('danger');
  });
});
