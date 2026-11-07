/**
 * 版本历史时间线渲染契约（2026-11-04 收敛：只展示版本里程碑）：
 *  · 快照（回滚 / 修改节点等前端变动记录）不再进入历史 UI——即使 store 里有
 *  · 无过滤 chips（快照层移除后无过滤需求）
 *  · 全列表不存在「设为生效」直切入口
 *  · 里程碑有「载入 / 对比」动作，meta 正确标注来源（会话落版 / 手动保存 / 初始创建）
 *  · 「当前」按内容键判定：画布内容（忽略节点坐标）与哪个版本相同，哪个标「当前」且无载入按钮
 *  · 未落版（无 workflowCode）显示引导文案
 *
 * 直连 CanvasHistoryTimeline（纯内容组件），绕开 Semi Popover 的 portal 点击。
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';

// jsdom 没有 canvas：Semi 的传递依赖在 import 阶段取 2d context，先补 stub
const ctxStub: any = new Proxy(
  {},
  {
    get: (_t, key) => (key === 'canvas' ? {} : () => ctxStub),
    set: () => true,
  }
);
(HTMLCanvasElement.prototype as any).getContext = () => ctxStub;

const { MemoryRouter } = await import('react-router-dom');
const { AgentProvider } = await import('../../../agent/AgentContext');
const { sessionRuntime } = await import('../../../agent/runtime/store');
const { WorkflowDocument, workflowDocumentStore } = await import('../../../document');
const { CanvasHistoryTimeline } = await import('../CanvasHistoryPopover');
import type { GaiaWorkflowVersion } from '../../../services/workflow-api';

let container: HTMLElement;
let root: Root;

/** 画布基线内容：两个节点一条边（v1.1 与画布一致的版本就用它） */
const rawV11 = {
  nodes: [
    { id: 'n1', type: 'start', meta: { position: { x: 0, y: 0 } } },
    { id: 'n2', type: 'llm', meta: { position: { x: 200, y: 0 } } },
  ],
  edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
};

/** 画布放上 v1.1 的内容，同时留下几条快照（模拟手动编辑/回滚轨迹） */
function seedCanvasWithSnapshots() {
  workflowDocumentStore.clear({ wipePersisted: true });
  workflowDocumentStore.replace(
    WorkflowDocument.fromJSON({
      nodes: [{ id: 'n1', type: 'start', meta: { position: { x: 0, y: 0 } } }],
      edges: [],
    }),
    { kind: 'replace', source: 'system', reason: 'ai-generate' }
  );
  workflowDocumentStore.replace(WorkflowDocument.fromJSON(rawV11), {
    kind: 'replace',
    source: 'user',
    reason: 'user-edit',
  });
}

const versionFixtures: GaiaWorkflowVersion[] = [
  {
    id: 2,
    workflowCode: 'wf_demo',
    versionNumber: 'v1.2',
    versionDesc: '接入知识库',
    createdBy: 'agent',
    sourceSession: 'sess-1',
    createdAt: '2026-11-02 10:00:00',
    isCurrent: 1,
  },
  {
    id: 1,
    workflowCode: 'wf_demo',
    versionNumber: 'v1.1',
    versionDesc: '稳定版',
    createdBy: 'user',
    createdAt: '2026-10-30 09:00:00',
    isCurrent: 0,
  },
];

function renderTimeline(props: Record<string, unknown> = {}) {
  act(() => {
    root.render(
      <MemoryRouter>
        <AgentProvider>
          <CanvasHistoryTimeline
            workflowCode="wf_demo"
            versions={versionFixtures}
            onLoadVersion={() => {}}
            {...(props as any)}
          />
        </AgentProvider>
      </MemoryRouter>
    );
  });
}

const text = () => container.textContent || '';
const buttons = (label: string) =>
  Array.from(container.querySelectorAll('button')).filter((b) => b.textContent === label);

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  seedCanvasWithSnapshots();
  sessionRuntime.reset('history-versions-only-test');
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('版本历史时间线（2026-11-04 只留版本里程碑契约）', () => {
  it('快照不进 UI：store 里有快照轨迹，列表只渲染版本里程碑', () => {
    renderTimeline();
    // 里程碑在
    expect(text()).toContain('v1.2');
    expect(text()).toContain('接入知识库');
    expect(text()).toContain('生效中');
    // 快照来源标签（前端变动记录）一律不出现
    expect(text()).not.toContain('手动编辑');
    expect(text()).not.toContain('AI 生成');
    expect(text()).not.toContain('回滚');
    // 过滤 chips 已无意义，不再渲染
    expect(buttons('全部').length).toBe(0);
    expect(buttons('仅版本').length).toBe(0);
  });

  it('全列表不存在「设为生效」直切入口', () => {
    renderTimeline();
    expect(text()).not.toContain('设为生效');
  });

  it('里程碑：载入 / 对比动作 + 来源 meta（会话落版 / 手动保存）', () => {
    renderTimeline();
    // v1.2 内容未知（无 workflowData → 键为 null ≠ 画布）→ 有载入；v1.1 见下一条用例
    expect(buttons('载入').length).toBeGreaterThanOrEqual(1);
    expect(buttons('对比上一版').length).toBe(2);
    expect(text()).toContain('会话落版'); // sourceSession 有值
    expect(text()).toContain('手动保存'); // createdBy=user
  });

  it('「当前」按内容键判定：画布=v1.1 内容 → v1.1 标当前且无载入按钮（键含坐标，同内容才命中）', () => {
    const versionsWithDsl: GaiaWorkflowVersion[] = [
      versionFixtures[0],
      { ...versionFixtures[1], workflowData: JSON.stringify(rawV11) },
    ];
    renderTimeline({ versions: versionsWithDsl });
    const curMarks = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '当前' && !s.closest('button')
    );
    expect(curMarks.length).toBe(1);
    // v1.1 = 画布当前内容 → 不提供载入；v1.2 仍可载入（唯一载入按钮）
    expect(buttons('载入').length).toBe(1);
    expect(text()).toContain('v1.1');
    expect(text()).toContain('稳定版');
  });

  it('未落版（无 workflowCode）：显示引导文案', () => {
    renderTimeline({ workflowCode: undefined, versions: [] });
    expect(text()).toContain('先保存为版本再看');
  });

  it('底部说明写明「载入不影响线上」', () => {
    renderTimeline();
    expect(text()).toContain('不影响线上版本');
  });

  it('里程碑来源 meta：createdBy=system 的初始版显示「初始创建」', () => {
    renderTimeline({
      versions: [
        {
          id: 9,
          workflowCode: 'wf_demo',
          versionNumber: 'v1.0',
          createdBy: 'system',
          createdAt: '2026-10-20 09:00:00',
          isCurrent: 0,
        },
      ],
    });
    expect(text()).toContain('初始创建');
    expect(text()).not.toContain('编辑器落版');
  });
});
