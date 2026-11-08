/**
 * 侧栏分组展开态跨路由重建契约（2026-11-08 交互审计）：
 * /chat 与 /workflows 是两条互不相干的路由分支，各渲染一份 AppRail→ProjectRail；
 * /workflows 点对话、对话页点「工作流管理」都会整棵卸载重建侧栏，局部 state
 * 归零曾把用户手动展开的分组（默认空间 + 未分组）全部折叠。契约：
 *  · 展开 → 卸载（路由切走）→ 重挂：分组仍展开，组内会话可见
 *  · 折叠同样持久化：不是「重挂后一律展开」
 *  · 「当前会话所在分组自动展开」与恢复值叠加，不互相覆盖
 *
 * useAgent 打桩为固定数据（分组行依赖 folders/sessions 才渲染，且不走网络）。
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';

const agentState = vi.hoisted(() => ({
  folders: [] as Array<{ id: number; name: string }>,
  sessions: [] as Array<{ sessionKey: string; title: string; folderId: number | null }>,
  currentSessionKey: null as string | null,
}));

vi.mock('../../../agent/AgentContext', () => ({
  useAgent: () => ({
    ...agentState,
    createFolder: async () => null,
    renameFolder: async () => {},
    deleteFolder: async () => {},
    switchSession: async () => {},
    createSession: async () => {},
    deleteSession: async () => {},
    renameSession: async () => {},
  }),
}));

// jsdom 没有 canvas：Semi 的传递依赖在 import 阶段取 2d context，先补 stub
const ctxStub: any = new Proxy(
  {},
  {
    get: (_t, key) => (key === 'canvas' ? {} : () => ctxStub),
    set: () => true,
  }
);
(HTMLCanvasElement.prototype as any).getContext = () => ctxStub;

const { ProjectRail } = await import('../ProjectRail');

let container: HTMLElement;
let root: Root;

/** 挂载一份全新的侧栏实例（等价于路由切进 /chat 或 /workflows） */
function mountRail() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<ProjectRail onSelect={() => {}} onNewTask={() => {}} />);
  });
}

/** 卸载侧栏实例（等价于路由切走，整棵分支被 React 销毁） */
function unmountRail() {
  act(() => root.unmount());
  container.remove();
}

const groupRow = (label: string): HTMLElement => {
  const row = Array.from(
    container.querySelectorAll<HTMLElement>('[role="button"][aria-expanded]')
  ).find((el) => el.textContent?.includes(label));
  if (!row) throw new Error(`group row not found: ${label}`);
  return row;
};

const isOpen = (label: string) => groupRow(label).getAttribute('aria-expanded') === 'true';

const click = (el: HTMLElement) =>
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

beforeEach(() => {
  localStorage.clear();
  agentState.folders = [{ id: 1, name: '默认空间' }];
  agentState.sessions = [
    { sessionKey: 's1', title: '空间内任务', folderId: 1 },
    { sessionKey: 's2', title: '未归属闲聊', folderId: null },
  ];
  agentState.currentSessionKey = null;
});

afterEach(() => {
  if (container?.isConnected) unmountRail();
  localStorage.clear();
});

describe('ProjectRail 展开态跨路由重建', () => {
  it('展开默认空间 + 未分组 → 路由切走卸载 → 重挂：两组仍展开且会话可见', () => {
    mountRail();
    expect(isOpen('默认空间')).toBe(false);
    expect(isOpen('未分组')).toBe(false);

    click(groupRow('默认空间'));
    click(groupRow('未分组'));
    expect(isOpen('默认空间')).toBe(true);
    expect(isOpen('未分组')).toBe(true);

    unmountRail();
    mountRail();

    expect(isOpen('默认空间')).toBe(true);
    expect(isOpen('未分组')).toBe(true);
    expect(container.textContent).toContain('空间内任务');
    expect(container.textContent).toContain('未归属闲聊');
  });

  it('折叠同样持久化：展开后再折叠，重挂保持折叠', () => {
    mountRail();
    click(groupRow('默认空间'));
    click(groupRow('未分组'));
    click(groupRow('默认空间'));
    click(groupRow('未分组'));

    unmountRail();
    mountRail();

    expect(isOpen('默认空间')).toBe(false);
    expect(isOpen('未分组')).toBe(false);
  });

  it('当前会话所在分组自动展开，与恢复的未分组展开态叠加', () => {
    mountRail();
    click(groupRow('未分组'));
    unmountRail();

    // 切到默认空间里的对话：重挂时默认空间由 effect 自动展开，未分组由持久化恢复
    agentState.currentSessionKey = 's1';
    mountRail();

    expect(isOpen('默认空间')).toBe(true);
    expect(isOpen('未分组')).toBe(true);
  });
});
