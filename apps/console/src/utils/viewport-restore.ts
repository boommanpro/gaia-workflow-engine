/**
 * 视野保持 —— 跨画布重挂保留用户的缩放/滚动位置。
 *
 * 编辑器加载期会连续重挂数次（版本加载、会话对账、StrictMode 双跑，实测一页
 * 8 次 onInit），每条新管线初始化时视口都被打回 zoom=1/scroll=0 —— 用户在重挂
 * 间隙刚做好的缩放会「闪一下回到原位」（2026-10-26 首次放大闪回）。
 *
 * 机制：
 *  · 管线 onInit 时订阅其 onZoom/onScroll，用户视口一变就更新快照（持续追踪，
 *    不依赖销毁时点——僵尸管线/空壳 StrictMode 管线不会发出事件，不会污染快照）；
 *  · 新管线 onInit 时，若工作流内容指纹（节点 id 集 + 边集，取自全局 store，
 *    不受管线销毁顺序影响）与快照一致，则**原样恢复**用户视口；
 *  · 内容变了（首次进入 / 切版本 / AI 增删节点）由调用方另行 fitView。
 * 恢复与拟合均为瞬时（easing=false），无滑移动画。
 *
 * 注意：本应用的 onAllLayersRendered 不可靠（实测可能 30s 后才触发甚至不触发），
 * 视口恢复因此挂在必然触发的 onInit 上，不要移回渲染回调。
 */
import { workflowDocumentStore } from '../document';

interface ViewportSnapshot {
  zoom: number;
  scrollX: number;
  scrollY: number;
}

/**
 * 视口快照按内容指纹分桶：SPA 切换到别的工作流/草稿再回来时，中间页面的
 * fitView 不会覆盖用户在原工作流存下的视口（单值快照会互相覆盖，2026-10-26）。
 * 容量上限淘汰最旧的键，防止长会话无限增长。
 */
const MAX_SAVED_KEYS = 20;
const savedMap = new Map<string, ViewportSnapshot>();

function rememberSnapshot(key: string, snapshot: ViewportSnapshot): void {
  if (!key || key === '|') return; // 空内容指纹不占用快照
  savedMap.delete(key);
  savedMap.set(key, snapshot);
  while (savedMap.size > MAX_SAVED_KEYS) {
    const oldest = savedMap.keys().next().value;
    if (oldest === undefined) break;
    savedMap.delete(oldest);
  }
}

/** 内容指纹：节点 id 集 + 边集（与编辑器/对账层的结构键同义，独立实现避免循环依赖） */
export function contentStructureKey(doc: unknown): string {
  try {
    const json = (typeof (doc as any)?.toJSON === 'function' ? (doc as any).toJSON() : doc) as any;
    const nodes = (json?.nodes || []).map((n: any) => String(n.id)).sort().join(',');
    const edges = (json?.edges || [])
      .map((e: any) => `${e?.sourceNodeID ?? e?.from?.id ?? ''}->${e?.targetNodeID ?? e?.to?.id ?? ''}`)
      .sort()
      .join(',');
    return `${nodes}|${edges}`;
  } catch {
    return '';
  }
}

/** 当前工作流内容指纹（以全局 store 为准，画布只是它的视图） */
function currentKey(): string {
  try {
    return contentStructureKey(workflowDocumentStore.getSnapshot().doc);
  } catch {
    return '';
  }
}

/**
 * 管线初始化时调用：订阅视口变化持续更新快照，并按内容指纹决定是否恢复。
 * 返回 true 表示本次恢复了保存的视口。
 */
export function trackAndRestoreViewport(ctx: any): boolean {
  try {
    const playground = ctx?.playground;
    const cfg = playground?.config;
    if (!playground || !cfg) return false;

    // 同一条管线只订阅一次；Zoom/Scroll 事件即用户视口的最新值
    if (!(ctx as any).__vpTracking) {
      (ctx as any).__vpTracking = true;
      const record = () => {
        rememberSnapshot(currentKey(), {
          zoom: Number(cfg.zoom) || 1,
          scrollX: Number(cfg.config?.scrollX) || 0,
          scrollY: Number(cfg.config?.scrollY) || 0,
        });
      };
      playground.onZoom?.(record);
      playground.onScroll?.(record);
    }

    const key = currentKey();
    const saved = savedMap.get(key);
    if (saved) {
      cfg.updateConfig({ zoom: saved.zoom, scrollX: saved.scrollX, scrollY: saved.scrollY });
      return true;
    }
  } catch {
    /* fall through */
  }
  return false;
}

/**
 * 数据推送后的视野收敛（canvas-sync binding）：内容未变（重挂/对账回填）则恢复
 * 用户视口；内容变了（AI 增删节点）才重新适配全图。均为瞬时，无滑移动画。
 */
export function restoreOrFitView(ctx: any): boolean {
  const key = currentKey();
  try {
    const cfg = ctx?.playground?.config;
    const saved = key ? savedMap.get(key) : undefined;
    if (cfg && saved) {
      cfg.updateConfig({ zoom: saved.zoom, scrollX: saved.scrollX, scrollY: saved.scrollY });
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    ctx?.tools?.fitView(false);
  } catch {
    /* 编辑器可能已卸载 */
  }
  return false;
}
