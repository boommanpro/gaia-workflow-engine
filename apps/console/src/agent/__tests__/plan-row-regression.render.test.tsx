/**
 * P0 死循环回归钉子（2026-10-24 事故）：hidePlanCards=true 的消息列表遇到
 * 带 planSteps 的 tool 行（plan 事件 upsert 的 plan-live 行）必须正常消费并渲染，
 * 不得陷入「分组循环 break 不推进 i」的无限循环（该 bug 曾让页面整页冻死）。
 *
 * jsdom 单线程环境里死循环 = 测试超时失败，因此「能跑完」本身就是验收。
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';

// jsdom 没有 canvas：ChatMessageList 的传递依赖（Semi/lottie）在 import 阶段就取 2d context。
// 先补一个 no-op context stub，再动态拉组件 —— 保证「渲染能跑完」这一验收本身可执行。
const ctxStub: any = new Proxy({}, {
  get: (_t, key) => (key === 'canvas' ? {} : () => ctxStub),
  set: () => true,
});
(HTMLCanvasElement.prototype as any).getContext = () => ctxStub;

const { MemoryRouter } = await import('react-router-dom');
const { AgentProvider } = await import('../AgentContext');
const { sessionRuntime } = await import('../runtime/store');
const { ChatMessageList } = await import('../../chat/ChatMessageList');

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  sessionRuntime.reset('plan-regression');
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('plan 行 × hidePlanCards（死循环回归钉子）', () => {
  it('hidePlanCards：plan-live 行被跳过渲染但列表正常完成，后续消息不丢', () => {
    // 现场：用户消息 + live 行 + plan-live 行（plan 事件 upsert）+ 又一条用户消息
    sessionRuntime.dispatch({ type: 'optimistic-user', text: '帮我建工作流' });
    sessionRuntime.dispatch({ type: 'event', name: 'run_state', data: { status: 'running', runId: 'r1' }, seq: 1 });
    sessionRuntime.dispatch({
      type: 'event',
      name: 'plan',
      seq: 2,
      data: { kind: 'todo', steps: [{ id: 's1', intent: '第一步', status: 'running' }] },
    });
    sessionRuntime.dispatch({ type: 'optimistic-user', text: '继续' });

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/chat']}>
          <AgentProvider>
            <ChatMessageList hidePlanCards />
          </AgentProvider>
        </MemoryRouter>
      );
    });

    // 渲染完成（没有卡死）；plan 卡被隐藏但 plan-live 行后面的消息仍然渲染
    expect(container.textContent).toContain('帮我建工作流');
    expect(container.textContent).toContain('继续');
    expect(container.textContent).not.toContain('第一步');
  });

  it('hidePlanCards=false：plan 卡正常渲染', () => {
    sessionRuntime.dispatch({ type: 'event', name: 'run_state', data: { status: 'running', runId: 'r1' }, seq: 1 });
    sessionRuntime.dispatch({
      type: 'event',
      name: 'plan',
      seq: 2,
      data: { kind: 'todo', steps: [{ id: 's1', intent: '唯一步骤', status: 'pending' }] },
    });

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/chat']}>
          <AgentProvider>
            <ChatMessageList />
          </AgentProvider>
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('唯一步骤');
  });
});
