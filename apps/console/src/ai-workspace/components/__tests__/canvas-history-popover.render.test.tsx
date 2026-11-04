/**
 * 统一历史时间线渲染契约（2026-11-03 改版）：
 *  · 快照与落版版本渲染在同一列表（不再是「本会话版本 / 落版版本」两个分区）
 *  · 快照行不出现 vN 序号（避免与版本号 v1.x 两套编号打架）
 *  · 「仅版本」过滤后快照隐藏、版本里程碑保留
 *  · 全列表不存在「设为生效」直切入口（线上切换只留编辑器「发布生效」确认链）
 *  · 版本里程碑有「载入 / 对比」动作，meta 正确标注来源（会话落版 / 手动保存）
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

/** 造两条快照：AI 生成（1 节点）→ 手动编辑（加 1 节点 1 边，成为当前态）。
 *  注意 source='ai' 的变更会被 store 挂起到 run 结束（captureAiRunSnapshot），
 *  种子里用 'system' 让快照即时落账。 */
function seedSnapshots() {
  workflowDocumentStore.clear({ wipePersisted: true });
  workflowDocumentStore.replace(
    WorkflowDocument.fromJSON({
      nodes: [{ id: 'n1', type: 'start', meta: { position: { x: 0, y: 0 } } }],
      edges: [],
    }),
    { kind: 'replace', source: 'system', reason: 'ai-generate' }
  );
  workflowDocumentStore.replace(
    WorkflowDocument.fromJSON({
      nodes: [
        { id: 'n1', type: 'start', meta: { position: { x: 0, y: 0 } } },
        { id: 'n2', type: 'llm', meta: { position: { x: 200, y: 0 } } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    }),
    { kind: 'replace', source: 'user', reason: 'user-edit' }
  );
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
  seedSnapshots();
  sessionRuntime.reset('history-timeline-test');
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('统一历史时间线（2026-11-03 改版契约）', () => {
  it('快照与版本混排同一列表，快照来源标签可读', () => {
    renderTimeline();
    // 快照区：两条来源标签 + 当前标记
    expect(text()).toContain('AI 生成');
    expect(text()).toContain('手动编辑');
    expect(text()).toContain('当前');
    // 版本里程碑：版本号 + 描述 + 生效中
    expect(text()).toContain('v1.2');
    expect(text()).toContain('接入知识库');
    expect(text()).toContain('生效中');
  });

  it('全列表不存在「设为生效」直切入口', () => {
    renderTimeline();
    expect(text()).not.toContain('设为生效');
    // 旧的两分区标题也不应再出现
    expect(text()).not.toContain('本会话版本');
    expect(text()).not.toContain('落版版本');
  });

  it('版本里程碑：载入 / 对比动作 + 来源 meta（会话落版 / 手动保存）', () => {
    const loaded: number[] = [];
    renderTimeline({ onLoadVersion: (id: number) => loaded.push(id) });
    // 「载入」共 3 处：旧快照 1 条 + 非查看态版本 2 条（含生效版本身——会话画布可能已偏离）；
    // DOM 顺序为快照在前、版本在后（v1.2 → v1.1）
    expect(buttons('载入').length).toBe(3);
    // 点 v1.1（最后一个载入按钮）→ 回调收到版本 id
    act(() => {
      buttons('载入')[2].click();
    });
    expect(loaded).toEqual([1]);
    // 每个版本都有对比入口
    expect(buttons('对比上一版').length).toBeGreaterThanOrEqual(2);
    expect(text()).toContain('会话落版'); // sourceSession 有值
    expect(text()).toContain('手动保存'); // createdBy=user
  });

  it('「仅版本」过滤后快照隐藏、版本保留', () => {
    renderTimeline();
    const chip = buttons('仅版本')[0];
    expect(chip).toBeTruthy();
    act(() => {
      chip.click();
    });
    expect(text()).not.toContain('手动编辑');
    expect(text()).not.toContain('AI 生成');
    expect(text()).toContain('v1.2');
  });

  it('未落版（无 workflowCode）：显示引导文案', () => {
    renderTimeline({ workflowCode: undefined, versions: [] });
    expect(text()).toContain('先保存为版本再看');
  });

  it('底部说明写明「载入不影响线上」', () => {
    renderTimeline();
    expect(text()).toContain('不影响线上版本');
  });

  it('载入不留行：与里程碑同内容的 import 快照隐藏，里程碑标「当前」', () => {
    // 造一条 reason='import' 的快照，内容与 v1.1 的 DSL 完全一致（= 载入 v1.1 后的状态）
    const rawV11 = {
      nodes: [
        { id: 'n1', type: 'start', meta: { position: { x: 0, y: 0 } } },
        { id: 'n2', type: 'llm', meta: { position: { x: 200, y: 0 } } },
        { id: 'n3', type: 'end', meta: { position: { x: 400, y: 0 } } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
      ],
    };
    workflowDocumentStore.clear({ wipePersisted: true });
    workflowDocumentStore.replace(WorkflowDocument.fromJSON(rawV11), {
      kind: 'replace',
      source: 'system',
      reason: 'import',
    });
    const versionsWithDsl: GaiaWorkflowVersion[] = [
      {
        ...versionFixtures[0],
        workflowData: JSON.stringify({ nodes: [{ id: 'nx', type: 'start' }], edges: [] }),
      },
      { ...versionFixtures[1], workflowData: JSON.stringify(rawV11) },
    ];
    renderTimeline({ versions: versionsWithDsl });
    // import 快照行被隐藏：来源标签「载入」不再出现（只看非按钮内的 span，排除按钮文案）
    const labelSpans = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '载入' && !s.closest('button')
    );
    expect(labelSpans.length).toBe(0);
    // 「当前」标记挂到 v1.1 里程碑上（唯一），且 v1.1 不再提供「载入」按钮（画布已在它上面）
    const curMarks = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '当前' && !s.closest('button')
    );
    expect(curMarks.length).toBe(1);
    // v1.2 内容不同：快照不隐藏它的对照——它仍有载入按钮（唯一的载入按钮）
    expect(buttons('载入').length).toBe(1);
    expect(text()).toContain('v1.2');
    expect(text()).toContain('v1.1');
  });
});
