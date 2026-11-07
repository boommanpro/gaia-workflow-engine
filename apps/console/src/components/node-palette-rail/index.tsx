/**
 * 左侧节点面板（偏好 gaia.editor.prefs.addPalette 控制显隐）：
 * 搜索 + 按分类分组的宽卡片（图标 / 名称 / 一句话描述），拖拽到画布创建节点。
 *
 * 拖拽语义（2026-11-05 验收迭代，指针式）：
 *   从卡片按下、拖到画布区域的一瞬间即创建真实节点（默认值与「添加节点」面板同源：
 *   registry.onAdd(ctx)），选中并交给 FlowGram 原生拖拽接管——手感与画布上拖动节点
 *   完全一致；未进入画布就松手则什么都不发生。
 *   参照 components/tools/comment.tsx 的 create → delay → selectNode →
 *   dragService.startDragSelectedNodes(event) 官方样板。
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  useClientContext,
  usePlayground,
  useService,
  WorkflowDocument,
  WorkflowOperationBaseService,
  WorkflowSelectService,
} from '@flowgram.ai/free-layout-editor';
import { IconChevronLeft, IconChevronRight, IconSearch, IconMenu } from '@douyinfe/semi-icons';

import { FlowNodeRegistry } from '../../typings';
import {
  NODE_CATEGORY_LABELS,
  NodeCategory,
  categoryColorVar,
  getNodeVisual,
} from '../../nodes/node-visuals';
import { getNodeLabel } from '../../nodes/i18n';
import { nodeRegistries } from '../../nodes';
import { useLanguage, t } from '../../i18n';

/** 含画布元素（批注）：批注同样可从左栏与「添加节点」面板添加 */
const CATEGORY_ORDER: NodeCategory[] = ['flow', 'model', 'logic', 'data', 'integration', 'canvas'];

const isVisibleInPalette = (reg: FlowNodeRegistry): boolean =>
  (reg.meta?.nodePanelVisible as boolean | undefined) !== false || reg.type === 'comment';

export const NodePaletteRail = () => {
  useLanguage();
  const ctx = useClientContext();
  const playground = usePlayground();
  const doc = useService(WorkflowDocument);
  const selectService = useService(WorkflowSelectService);
  // WorkflowOperationBaseService 是 inversify 绑定 token（实现为 WorkflowOperationBaseServiceImpl），
  // 类型侧导出为 unknown，这里按需收窄到 updateNodePosition
  const opService = useService(WorkflowOperationBaseService) as unknown as {
    updateNodePosition: (nodeOrId: string, position: { x: number; y: number }) => void;
  };
  const [keyword, setKeyword] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const railRootRef = useRef<HTMLDivElement | null>(null);
  // 拖拽会话标志同时挂到 window：编辑器加载期的结构对齐重挂据此避让，
  // 防止刚拖入、未同步进 store 的节点被整份重挂吞掉。
  // 2026-11-07 二次修复（首次拖入一闪即逝复发）：松手后延迟 900ms 才释放标志——
  // 画布回流 store 有 600ms 防抖（use-editor-props.flushCanvasChange），立即放行会让
  // 加载期的对齐重挂恰好落在「已松手、尚未回流」窗口，用旧 store 整份重挂吞掉新节点。
  const dragFlagTimer = useRef<number | null>(null);
  const setDragFlag = (v: boolean) => {
    if (dragFlagTimer.current !== null) {
      window.clearTimeout(dragFlagTimer.current);
      dragFlagTimer.current = null;
    }
    if (v) {
      (window as unknown as { __gaiaPaletteDrag?: boolean }).__gaiaPaletteDrag = true;
    } else {
      dragFlagTimer.current = window.setTimeout(() => {
        dragFlagTimer.current = null;
        (window as unknown as { __gaiaPaletteDrag?: boolean }).__gaiaPaletteDrag = false;
      }, 900);
    }
  };

  // 指针拖拽会话：卡片按下即建立；光标进入画布时一次性物化为真实节点并交接给画布拖拽
  const sessionRef = useRef<{ type: string; started: boolean; nodeId?: string } | null>(null);

  const registryByType = useMemo(() => {
    const map = new Map<string, FlowNodeRegistry>();
    for (const reg of nodeRegistries) map.set(String(reg.type), reg);
    return map;
  }, []);

  // 指针拖拽：光标进入画布的一瞬间物化为真实节点（默认值与「添加节点」面板同源：
  // registry.onAdd(ctx)），随后用官方 WorkflowOperationBaseService.updateNodePosition
  // 跟随光标（与画布拖动同一条渲染/撤销链路）；松手定形，Esc 回收。
  useEffect(() => {
    const host = playground.node as HTMLElement | null;
    if (!host) return;

    const inHost = (x: number, y: number) => {
      const r = host.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    const flowPos = (e: PointerEvent) => {
      const p = playground.config.getPosFromMouseEvent(e as unknown as React.MouseEvent);
      return { x: p.x, y: p.y - 45 };
    };

    const onMove = (e: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || (e.buttons & 1) === 0) return;
      if (playground.config.readonly) return;
      // 指针仍在侧栏面板上方时不物化（画布 host 的矩形包含侧栏覆盖区）
      const overRail = railRootRef.current?.contains(e.target as Node) ?? false;
      if (!session.started) {
        if (overRail || !inHost(e.clientX, e.clientY)) return; // 未进入画布：继续等待
        const registry = registryByType.get(session.type);
        if (!registry) {
          sessionRef.current = null;
          setDragFlag(false);
          setDragging(false);
          return;
        }
        const json = registry.onAdd?.(ctx) ?? {};
        const node = doc.createWorkflowNodeByType(session.type, flowPos(e), json as never);
        if (!node) {
          sessionRef.current = null;
          setDragFlag(false);
          setDragging(false);
          return;
        }
        session.started = true;
        session.nodeId = node.id;
        selectService.selectNode(node);
      } else if (session.nodeId) {
        opService.updateNodePosition(session.nodeId, flowPos(e));
      }
    };
    const onUp = () => {
      // 未物化就松手：什么都没发生；已物化：就地定形
      sessionRef.current = null;
      setDragFlag(false);
      setDragging(false);
    };
    const onKey = (e: KeyboardEvent) => {
      const session = sessionRef.current;
      if (e.key !== 'Escape' || !session?.nodeId) return;
      try {
        const node = doc.getNode(session.nodeId);
        if (node) doc.removeNode(node);
      } catch {
        /* ignore */
      }
      sessionRef.current = null;
      setDragFlag(false);
      setDragging(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
      setDragFlag(false);
    };
  }, [playground, doc, selectService, opService, registryByType, ctx]);

  const groups = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const list: FlowNodeRegistry[] = nodeRegistries.filter(
      (reg) =>
        reg.type !== 'group' &&
        isVisibleInPalette(reg) &&
        (!kw ||
          getNodeLabel(String(reg.type)).toLowerCase().includes(kw) ||
          String(reg.type).toLowerCase().includes(kw))
    );
    const byCat = new Map<NodeCategory, FlowNodeRegistry[]>();
    for (const reg of list) {
      const cat = getNodeVisual(reg.type).category;
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(reg);
    }
    return CATEGORY_ORDER.filter((c) => byCat.has(c)).map((c) => ({
      category: c,
      items: byCat.get(c)!,
    }));
  }, [keyword]);

  if (collapsed) {
    return (
      <button
        type="button"
        className="gaia-palette-rail--collapsed"
        aria-label={t('prefs.paletteExpand')}
        onClick={() => setCollapsed(false)}
      >
        <IconChevronRight />
      </button>
    );
  }

  return (
    <div
      ref={railRootRef}
      className={`gaia-palette-rail${dragging ? ' gaia-palette-rail--dragging' : ''}`}
      aria-label={t('prefs.paletteTitle')}
    >
      <div className="gaia-palette-rail-head">
        <span className="gaia-palette-rail-title">{t('prefs.paletteTitle')}</span>
        <button
          type="button"
          aria-label={t('prefs.paletteCollapse')}
          onClick={() => setCollapsed(true)}
        >
          <IconChevronLeft />
        </button>
      </div>
      <div className="gaia-palette-rail-search">
        <IconSearch size="small" />
        <input
          value={keyword}
          placeholder={t('prefs.paletteSearch')}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      <div className="gaia-palette-rail-body">
        {groups.map(({ category, items }) => (
          <div key={category} className="gaia-palette-rail-cat">
            <div className="gaia-palette-rail-cat-label">
              <span>{NODE_CATEGORY_LABELS[category]}</span>
              <span className="gaia-palette-rail-cat-count">{items.length}</span>
            </div>
            {items.map((reg) => {
              const visual = getNodeVisual(reg.type);
              const { Icon } = visual;
              return (
                <div
                  key={reg.type}
                  className="gaia-palette-rail-item"
                  role="button"
                  tabIndex={0}
                  aria-label={getNodeLabel(String(reg.type))}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.preventDefault(); // 阻止原生拖影/选中文本
                    sessionRef.current = { type: String(reg.type), started: false };
                    setDragFlag(true);
                    setDragging(true);
                  }}
                >
                  <div className="gaia-palette-rail-item-row">
                    <span
                      className="gaia-node-chip"
                      style={{ color: categoryColorVar(visual.category) }}
                    >
                      <Icon size={15} />
                    </span>
                    <span className="gaia-palette-rail-item-label">
                      {getNodeLabel(String(reg.type))}
                    </span>
                    <IconMenu className="gaia-palette-rail-grip" />
                  </div>
                  <div className="gaia-palette-rail-item-desc">
                    {t(`palette.desc.${String(reg.type)}`)}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {groups.length === 0 && (
          <div className="gaia-palette-rail-empty">{t('prefs.paletteEmpty')}</div>
        )}
      </div>
      <div className="gaia-palette-rail-foot">{t('prefs.paletteFoot')}</div>
    </div>
  );
};
