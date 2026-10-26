/**
 * 视野保持契约回归（2026-10-26 首次放大闪回）：
 * 重挂风暴期间，内容指纹未变时必须恢复用户视口；内容变了才重新 fitView。
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { WorkflowDocument } from '../../document/workflow-document';
import { workflowDocumentStore } from '../../document/store';
import {
  contentStructureKey,
  restoreOrFitView,
  trackAndRestoreViewport,
} from '../viewport-restore';

function makeCtx(zoom = 1, scrollX = 0, scrollY = 0) {
  const calls: { updateConfig: any[]; fitView: boolean[] } = { updateConfig: [], fitView: [] };
  const cfg: any = {
    zoom,
    config: { scrollX, scrollY },
    updateConfig(v: any) {
      calls.updateConfig.push(v);
      if (v.zoom !== undefined) this.zoom = v.zoom;
      if (v.scrollX !== undefined) this.config.scrollX = v.scrollX;
      if (v.scrollY !== undefined) this.config.scrollY = v.scrollY;
    },
  };
  const ctx: any = {
    document: {},
    playground: {
      config: cfg,
      onZoom(fn: () => void) {
        (this as any).__fireZoom = () => {
          cfg.zoom = 1.5;
          fn();
        };
      },
      onScroll(fn: () => void) {
        (this as any).__fireScroll = () => {
          cfg.config.scrollX = 120;
          cfg.config.scrollY = 80;
          fn();
        };
      },
    },
    tools: {
      fitView: (easing: boolean) => {
        calls.fitView.push(easing);
      },
    },
  };
  return { ctx, calls, cfg };
}

function storeSet(nodes: any[]): void {
  workflowDocumentStore.replace(
    WorkflowDocument.fromJSON({ nodes, edges: [] } as any),
    { kind: 'replace', source: 'ai', reason: 'ai-edit' }
  );
}

const graphA = [{ id: 'a_1', type: 'start', meta: {}, data: {} }, { id: 'b_1', type: 'end', meta: {}, data: {} }];
const graphB = [{ id: 'a_1', type: 'start', meta: {}, data: {} }, { id: 'c_1', type: 'end', meta: {}, data: {} }];

describe('viewport-restore（首次放大闪回回归）', () => {
  beforeEach(() => {
    storeSet(graphA);
  });

  it('无快照时初始化不恢复视口', () => {
    const { ctx, calls } = makeCtx();
    expect(trackAndRestoreViewport(ctx)).toBe(false);
    expect(calls.updateConfig).toHaveLength(0);
  });

  it('用户缩放后重挂：内容未变 → 新管线原样恢复缩放/滚动', () => {
    // 用户在旧管线上把画布调到 zoom 1.5 / 滚动 (120, 80)
    const { ctx: dying } = makeCtx();
    trackAndRestoreViewport(dying);
    (dying.playground as any).__fireZoom();
    (dying.playground as any).__fireScroll();

    // 重挂：新管线视口被打回 1/0/0，onInit 恢复用户视口
    const { ctx: fresh, calls, cfg } = makeCtx();
    expect(trackAndRestoreViewport(fresh)).toBe(true);
    expect(calls.updateConfig[0]).toEqual({ zoom: 1.5, scrollX: 120, scrollY: 80 });
    expect(cfg.zoom).toBe(1.5);
  });

  it('内容结构变了（切版本/AI 改结构）→ 不恢复旧视口', () => {
    const { ctx: dying } = makeCtx();
    trackAndRestoreViewport(dying);
    (dying.playground as any).__fireZoom();

    storeSet(graphB); // 节点集变化（如切版本）
    const { ctx: fresh, calls } = makeCtx();
    expect(trackAndRestoreViewport(fresh)).toBe(false);
    expect(calls.updateConfig).toHaveLength(0);
  });

  it('restoreOrFitView：内容未变恢复视口，内容变了走 fitView(false)', () => {
    const { ctx: dying } = makeCtx();
    trackAndRestoreViewport(dying);
    (dying.playground as any).__fireZoom();

    const same = makeCtx();
    expect(restoreOrFitView(same.ctx)).toBe(true);
    expect(same.calls.fitView).toHaveLength(0);

    storeSet(graphB);
    const changed = makeCtx();
    expect(restoreOrFitView(changed.ctx)).toBe(false);
    expect(changed.calls.fitView).toEqual([false]);
  });

  it('contentStructureKey：与节点/边集合相关，与顺序无关', () => {
    const k1 = contentStructureKey({ nodes: graphA, edges: [{ sourceNodeID: 'a_1', targetNodeID: 'b_1' }] });
    const k2 = contentStructureKey({
      nodes: [...graphA].reverse(),
      edges: [{ sourceNodeID: 'a_1', targetNodeID: 'b_1' }],
    });
    const k3 = contentStructureKey({ nodes: graphA, edges: [] });
    expect(k1).toBe(k2);
    expect(k1).not.toBe(k3);
  });
});
