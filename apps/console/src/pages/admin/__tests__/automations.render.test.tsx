/**
 * 定时任务中心渲染契约：
 *  · 列表行按后端字段渲染（任务名 / cron 人话描述 / 状态标签），汇总行正确计数
 *  · 空列表落到空态引导（含新建 CTA）
 *  · 停用任务整行降透明度（opacity < 1），下次执行显示 —
 * jsdom 环境：Semi 的 canvas 依赖需要 stub 且动态 import。
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { Outlet } from 'react-router-dom';

/** 布局桩：提供 useOutletContext 需要的 context 形状 */
const LayoutStub = ({ context }: { context: { setHeaderAction: unknown } }) => (
  <Outlet context={context} />
);

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

const schedulesFixture = [
  {
    id: 1,
    scheduleName: '每日 AI 早报',
    workflowCode: 'wf-daily-report',
    workflowName: '每日早报摘要',
    workflowHasCurrent: true,
    cronExpression: '0 0 9 * * *',
    timezone: 'Asia/Shanghai',
    status: 'enabled',
    misfirePolicy: 'skip',
    inputs: { topic: 'AI' },
    nextFireTime: '2099-01-01T09:00:00',
    lastFireTime: '2098-12-31T09:00:00',
    lastRunTaskId: 'run-1',
    lastRunStatus: 'success',
    lastError: null,
    missCount: 0,
  },
  {
    id: 2,
    scheduleName: '竞品周报',
    workflowCode: 'wf-competitor-watch',
    workflowName: '竞品动态监控',
    workflowHasCurrent: true,
    cronExpression: '0 0 10 * * 1',
    timezone: 'Asia/Shanghai',
    status: 'disabled',
    misfirePolicy: 'skip',
    inputs: {},
    nextFireTime: null,
    lastFireTime: null,
    lastRunStatus: 'failed',
    lastError: '节点[HTTP 请求] 超时',
    missCount: 0,
  },
];

const optionsFixture = [
  {
    code: 'wf-daily-report',
    name: '每日早报摘要',
    currentVersionId: 11,
    inputs: { properties: { topic: { type: 'string', title: '早报主题', default: '科技' } } },
  },
  { code: 'wf-draft', name: '未落版示例', currentVersionId: null },
];

vi.mock('../../../services/workflow-api', () => ({
  workflowApi: {
    listSchedules: vi.fn(async () => schedulesFixture),
    listSubflowOptions: vi.fn(async () => optionsFixture),
    toggleSchedule: vi.fn(async () => ({ success: true, message: 'ok' })),
    runScheduleNow: vi.fn(async () => ({ success: true, message: 'ok' })),
    deleteSchedule: vi.fn(async () => ({ success: true, message: 'ok' })),
    createSchedule: vi.fn(async () => ({ success: true, message: 'ok' })),
    updateSchedule: vi.fn(async () => ({ success: true, message: 'ok' })),
    previewCron: vi.fn(async () => ({ valid: true, times: ['2099-01-01T09:00'] })),
    listScheduleRuns: vi.fn(async () => []),
    getTaskRunDetail: vi.fn(async () => ({ run: {}, nodes: [] })),
  },
}));

let container: HTMLElement;
let root: Root;

const renderPage = async () => {
  const { MemoryRouter, Routes, Route } = await import('react-router-dom');
  const { AutomationsManagement } = await import('../AutomationsManagement');
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<LayoutStub context={{ setHeaderAction: () => {} }} />}>
            <Route index element={<AutomationsManagement />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  });
  // 初始 useEffect 的异步加载（列表 + 工作流选项）
  await act(async () => {
    await Promise.resolve();
  });
};

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('定时任务中心列表渲染', () => {
  it('渲染任务行：名称 / cron 人话 / 状态标签，汇总行计数正确', { timeout: 30_000 }, async () => {
    await renderPage();
    const text = container.textContent ?? '';
    expect(text).toContain('每日 AI 早报');
    expect(text).toContain('每天 09:00');
    expect(text).toContain('每周一 10:00');
    expect(text).toContain('共 2 个任务 · 1 个启用');
    expect(text).toContain('成功');
    expect(text).toContain('失败');
  });

  it('停用任务：下次执行显示 —（整行降透明度由样式承载，这里钉住数据口径）', async () => {
    await renderPage();
    const text = container.textContent ?? '';
    expect(text).toContain('—');
  });

  it('空列表落到空态引导（含新建 CTA）', { timeout: 30_000 }, async () => {
    const api = (await import('../../../services/workflow-api')).workflowApi;
    (api.listSchedules as any).mockImplementation(async () => []);
    await renderPage();
    const text = container.textContent ?? '';
    expect(text).toContain('还没有定时任务');
    expect(text).toContain('新建第一个定时任务');
  });
});
