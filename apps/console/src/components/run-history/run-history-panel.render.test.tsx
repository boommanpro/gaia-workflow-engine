/**
 * 运行历史面板（方案 A）渲染契约 —— 2026-11-07：
 * · 记录按日期分组、打开面板自动选中最近一条并回放（applyHistoryReport 被调用）
 * · 点击记录切换回放；节点轨迹行点击 → focusNode 定位画布节点
 * · 回放状态回调 → 面板头出现「回放中」徽标
 *
 * 编辑器上下文（panel-manager / DI service / router）以模块 mock 提供；
 * flowgram 面板层的真实挂载不在 jsdom 覆盖范围（交付说明如实标注）。
 */
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';

// jsdom 没有 canvas：Semi 的传递依赖在 import 阶段取 2d context（同 test-case-panel 测试）
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

const mocks = vi.hoisted(() => {
  const replayCbs: Array<(state: unknown) => void> = [];
  return {
    replayCbs,
    applyHistoryReport: vi.fn(),
    exitReplay: vi.fn(),
    focusNode: vi.fn(),
    panelClose: vi.fn(),
    runtimeService: {
      getReplay: vi.fn(
        (): { taskId: string; label: string; matched: number; total: number } | undefined =>
          undefined
      ),
      onReplayChanged: vi.fn((cb: (state: unknown) => void) => {
        mocks.replayCbs.push(cb);
        return { dispose: () => {} };
      }),
      onHistoryChanged: vi.fn(() => ({ dispose: () => {} })),
      applyHistoryReport: null as unknown as ReturnType<typeof vi.fn>,
      exitReplay: null as unknown as ReturnType<typeof vi.fn>,
      focusNode: null as unknown as ReturnType<typeof vi.fn>,
      isTaskRunning: vi.fn(() => false),
    },
  };
});
mocks.runtimeService.applyHistoryReport = mocks.applyHistoryReport;
mocks.runtimeService.exitReplay = mocks.exitReplay;
mocks.runtimeService.focusNode = mocks.focusNode;

vi.mock('@flowgram.ai/panel-manager-plugin', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePanelManager: () => ({
    open: vi.fn(),
    close: mocks.panelClose,
    getPanels: () => [],
  }),
}));
// free-layout-editor / runtime-service 用最小替身：组件链只需要 useService 与
// WorkflowRuntimeService 符号（真实模块会拉入带 .css 的 flowgram 全家桶，jsdom 无法加载）
vi.mock('@flowgram.ai/free-layout-editor', () => ({
  useService: () => mocks.runtimeService,
}));
vi.mock('../../plugins/runtime-plugin/runtime-service', async () => {
  // 纯逻辑来自 history-replay（只依赖 runtime-interface，jsdom 可加载）；
  // 服务类用空壳替身（真实类会拉入 flowgram 全家桶）
  const pure = await import('../../plugins/runtime-plugin/runtime-service/history-replay');
  return {
    WorkflowRuntimeService: class WorkflowRuntimeService {},
    historyStatusToKind: pure.historyStatusToKind,
  };
});

const { RunHistoryPanel } = await import('./run-history-panel');
const { RunReplayBanner } = await import('./replay-banner');
const { replayStore } = await import('../../plugins/runtime-plugin/runtime-service/history-replay');

let container: HTMLElement;
let root: Root;
const fetchMock = vi.fn();

const jsonResponse = (data: any) => ({ ok: true, json: () => Promise.resolve(data) });

/** 本地墙钟 ISO（后端返回的就是无时区字符串，面板按本地时间解析） */
const isoOf = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
};

/** 今天与昨天的两条运行记录（createdAt 驱动分组标签）；昨天取本地昨日 04:00，
 *  距今至少 4 小时以上，任何时区/运行时刻下都落在「昨天」日历日内 */
const now = new Date();
const todayIso = isoOf(now);
const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 4, 0, 0);
const yesterdayIso = isoOf(yesterdayDate);

const runsFixture = [
  {
    id: 1,
    taskId: 'task-ok',
    workflowCode: 'wf_x',
    status: 'success',
    durationMs: 57,
    triggerChannel: 'editor',
    createdAt: todayIso,
    finishedAt: todayIso,
    inputsJson: '{"input":"hi","score":85}',
    outputsJson: '{"result":"及格"}',
  },
  {
    id: 2,
    taskId: 'task-fail',
    workflowCode: 'wf_x',
    status: 'failed',
    errorMessage: 'llm_0: 401',
    durationMs: 1800,
    triggerChannel: 'editor',
    createdAt: yesterdayIso,
    finishedAt: yesterdayIso,
  },
];

const detailFixture = {
  run: runsFixture[0],
  nodes: [
    {
      id: 1,
      runTaskId: 'task-ok',
      nodeId: 'start_0',
      nodeType: 'start',
      title: '开始',
      // 后端存的是 WorkflowStatus 原始枚举值（succeeded），不是 run 级的 success
      status: 'succeeded',
      timeCostMs: 2,
      inputsJson: '{}',
      outputJson: '{"text":"hi"}',
    },
    {
      id: 2,
      runTaskId: 'task-ok',
      nodeId: 'llm_0',
      nodeType: 'llm',
      title: 'LLM 分析',
      status: 'failed',
      errorMessage: 'API Key 无效',
      timeCostMs: 1700,
      inputsJson: '{}',
      outputJson: null,
    },
    {
      id: 3,
      runTaskId: 'task-ok',
      nodeId: 'condition_0',
      nodeType: 'condition',
      title: '条件判断',
      // 引擎在运行结束时把未走到的分支节点标记 canceled（timeCost 0）
      status: 'canceled',
      timeCostMs: 0,
      inputsJson: null,
      outputJson: null,
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  mocks.applyHistoryReport.mockReset();
  mocks.focusNode.mockReset();
  mocks.replayCbs.length = 0;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

const mount = () =>
  act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/editor/wf_x']}>
        <Routes>
          <Route path="/editor/:workflowCode" element={<RunHistoryPanel />} />
        </Routes>
      </MemoryRouter>
    );
  });

const mockFetchRuns = () => {
  fetchMock.mockImplementation((url: string) => {
    const u = String(url);
    if (u.includes('/task/runs/task-ok')) return Promise.resolve(jsonResponse(detailFixture));
    if (u.includes('/task/runs?')) return Promise.resolve(jsonResponse({ records: runsFixture }));
    return Promise.resolve(jsonResponse({}));
  });
};

describe('运行历史面板（方案 A）', () => {
  it('记录按日期分组 + 自动选中最近一条并触发画布回放', async () => {
    mockFetchRuns();
    await mount();
    await act(async () => {});

    const text = container.textContent || '';
    expect(text).toContain('今天');
    expect(text).toContain('昨天');
    expect(text).toContain('2 条记录');
    // 自动选中第一条：详情与回放一步到位
    expect(text).toContain('成功');
    expect(text).toContain('入参');
    expect(text).toContain('返回值');
    expect(text).toContain('节点执行轨迹');
    expect(mocks.applyHistoryReport).toHaveBeenCalledTimes(1);
    const call = mocks.applyHistoryReport.mock.calls[0][0];
    expect(call.taskId).toBe('task-ok');
    expect(call.nodes).toHaveLength(3);
    expect(call.label).toBeTruthy();
  });

  it('点击另一条记录切换回放', async () => {
    mockFetchRuns();
    await mount();
    await act(async () => {});
    mocks.applyHistoryReport.mockClear();

    const row = Array.from(container.querySelectorAll('[role="button"]')).find((el) =>
      (el.textContent || '').includes('task-fail')
    );
    // 记录行显示的是时间而非 taskId：改按「昨天」分组的行（含 1.8s 时长）
    const failRow =
      row ||
      Array.from(container.querySelectorAll('[role="button"]')).find((el) =>
        (el.textContent || '').includes('1.8s')
      );
    expect(failRow).toBeTruthy();
    await act(async () => {
      failRow!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {});

    expect(mocks.applyHistoryReport).toHaveBeenCalledTimes(1);
    expect(mocks.applyHistoryReport.mock.calls[0][0].taskId).toBe('task-fail');
    // 失败记录详情：错误信息 callout 可见
    expect(container.textContent).toContain('llm_0: 401');
  });

  it('回放状态回调 → 面板头「回放中」徽标', async () => {
    mockFetchRuns();
    await mount();
    await act(async () => {});
    expect(mocks.replayCbs.length).toBeGreaterThan(0);

    await act(async () => {
      mocks.replayCbs.forEach((cb) =>
        cb({ taskId: 'task-ok', label: '11/07 11:15:49', matched: 2, total: 3 })
      );
    });
    expect(container.textContent).toContain('回放中');
  });

  it('节点轨迹行点击 → focusNode 定位画布节点', async () => {
    mockFetchRuns();
    await mount();
    await act(async () => {});

    const traceRow = Array.from(container.querySelectorAll('[title*="定位节点"]')).find((el) =>
      (el.textContent || '').includes('LLM 分析')
    );
    expect(traceRow).toBeTruthy();
    await act(async () => {
      traceRow!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(mocks.focusNode).toHaveBeenCalledWith('llm_0');
  });

  it('画布回放横幅：来源标签 + 部分匹配提示 + 退出回放（模块 store 驱动，无 DI）', async () => {
    const exit = vi.fn();
    await act(async () => {
      replayStore.publish({
        state: { taskId: 'task-ok', label: '11/07 11:15:49', matched: 2, total: 3 },
        exit,
      });
      root.render(<RunReplayBanner />);
    });

    const text = container.textContent || '';
    expect(text).toContain('回放模式');
    expect(text).toContain('11/07 11:15:49');
    expect(text).toContain('2/3 节点匹配当前画布');

    const exitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('退出回放')
    );
    expect(exitBtn).toBeTruthy();
    await act(async () => {
      exitBtn!.click();
    });
    expect(exit).toHaveBeenCalledTimes(1);

    // store 清空（service exitReplay/reset 的动作）→ 横幅消失
    await act(async () => {
      replayStore.publish(null);
    });
    expect(container.textContent).toBe('');
  });
});
