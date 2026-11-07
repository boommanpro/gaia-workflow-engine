/**
 * LightCanvas —— 产物面板的轻量只读画布预览（纯 SVG 自绘，可缩放/平移）。
 *
 * 取代旧 ReadonlyCanvas（整个 flowgram 编辑器实例随 key 重挂）：
 * remount 风暴曾是「页面无响应」的直接元凶（IoC 容器 + 全部插件 + 每节点表单）。
 * 预览只需要表达「有哪些节点、怎么连」，SVG 全量重绘 ~50 节点在 5ms 内，
 * 增长中的工作流可以每个 document 事件都刷新，不再需要 3 秒采样节流。
 * 完整交互编辑只在 /editor 页面的真实编辑器里发生。
 *
 * 紧凑重排（compact relayout）：fit-all 下节点显示尺寸 = 节点宽 × min(面板宽/图宽,
 * 面板高/图高)，等比缩小节点不改变显示尺寸——关键是让图的纵横比逼近竖长面板。
 * 后端 ELK 布局按 168px 大节点留距（宽扁图），预览不复用其坐标，只取其结构：
 * 按 x 聚类成列（同列 x 严格对齐）、列内按 y 序垂直居中紧凑堆叠，
 * 主干居中一条线、分支上下对称展开；节点渲染为单行小徽章。
 *
 * 视口交互（对齐 Figma / Miro / tldraw / React Flow design-tool 惯例）：
 * - 普通滚轮 / 触控板两指滚动 → 平移（滚动语义，方向与 /editor 编辑器一致）；
 *   ⌘/Ctrl+滚轮、触控板捏合（浏览器合成带 ctrlKey 的 wheel 事件）→ 以光标为锚缩放。
 *   缩放率按 deltaY 幅度连续计算（d3-zoom wheelDelta 同源思路），触控板捏合细腻跟手，
 *   鼠标滚轮一格约 ×1.1，不再是固定大步长。
 * - 拖拽平移、双击复位；程序化缩放（±按钮 / 复位）走 ~180ms ease-out 补间，
 *   滚轮与拖拽直接跟手不动画（避免与用户输入叠加产生「飘」感）。
 * - 用户一旦缩放/平移即「冻结」布局 viewBox：AI 流式新增节点重算布局时视口纹丝不动，
 *   「适应画布」/双击一键解冻并回到 fit-all。
 *
 * 连线：水平进出、控制点按水平间距伸缩的贝塞尔（d3 linkHorizontal 风格）；
 * 同源多出边 / 同汇多入边在两端各自扇形错开；颜色对齐 /editor 编辑器的
 * --g-workflow-line-color-default，V 形开放箭头。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { categoryColor, getNodeVisual } from '../../nodes/node-visuals';
import { t } from '../../i18n';
import type { WorkflowDsl } from '../../document';

interface NodeBox {
  id: string;
  title: string;
  type: string;
  x: number;
  y: number;
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 视口状态：zoom 为相对 fit-all 视图的倍数；pan 在 translate(scale) 外层（viewBox 用户单位） */
interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

// ===== 紧凑布局参数（单行徽章 + 列内居中堆叠） =====
const BADGE_W = 120;
const BADGE_H = 30;
const GAP_COL = 36; // 列间距（水平）
const GAP_ROW = 14; // 列内行距（垂直）
/** 列聚类容差：半个编辑器节点宽；ELK 列距（≥200）远大于容差，同列 x 严格对齐 */
const COL_TOL = 84;

const ZOOM_MIN = 0.5;
// fit-all 基准下面板仅 ~420px 宽，上限放宽让文字可放大到可读
const ZOOM_MAX = 8;
/** ±按钮/程序化缩放的单步倍率（React Flow zoomIn 同款默认值） */
const ZOOM_STEP = 1.2;
/** wheel 缩放：factor = exp(-clamp(Δ, ±MAX_WHEEL_DELTA) × WHEEL_SENSITIVITY) */
const MAX_WHEEL_DELTA = 10;
const WHEEL_SENSITIVITY = 0.01;
/** 程序化缩放补间时长（d3-zoom 双击默认 250ms 的轻量档） */
const ANIM_MS = 180;
/** 连线与编辑器共用一个 CSS 变量（单一来源） */
const LINE_COLOR = 'var(--g-workflow-line-color-default, #4d53e8)';
const LINE_WIDTH = 1.6;
/** 同源多出边 / 同汇多入边的扇形错位间距 */
const EDGE_OUT_GAP = 12;
const EDGE_IN_GAP = 10;
/** 贝塞尔控制点水平伸出量：d = clamp(dx/2, 24, 96) */
const CTRL_MIN = 24;
const CTRL_MAX = 96;
/** viewBox 外边距 */
const VB_PAD = 28;

const HOME_VIEW: ViewState = { zoom: 1, panX: 0, panY: 0 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clampZoom = (z: number) => clamp(z, ZOOM_MIN, ZOOM_MAX);

/** wheel 事件按像素归一（deltaMode：1=行≈33px，2=页≈视口高） */
function wheelDeltaToPx(e: WheelEvent): number {
  if (e.deltaMode === 1) return e.deltaY * 33;
  if (e.deltaMode === 2) return e.deltaY * window.innerHeight;
  return e.deltaY;
}

/** 分类色派生自 nodes/node-visuals 单源（P-01），深浅主题取值跟随 gaia.themeMode */
function typeColor(type: string): { fill: string; stroke: string } {
  const color = categoryColor(
    getNodeVisual(type).category,
    document.documentElement.dataset.theme === 'dark'
  );
  return { fill: `${color}1a`, stroke: color };
}

export const LightCanvas: React.FC<{ dsl: WorkflowDsl }> = ({ dsl }) => {
  const { nodes, edges, viewBox } = useMemo(() => {
    const rawNodes = (dsl?.nodes || []) as any[];
    const rawEdges = (dsl?.edges || []) as any[];

    const hasPos = (n: any) =>
      Number.isFinite(n?.meta?.position?.x) && Number.isFinite(n?.meta?.position?.y);

    // 1) 有坐标节点按 x 聚类成列（后端 ELK 分层输出，同列 x 严格对齐），列内按 y 升序
    const positioned = rawNodes
      .filter(hasPos)
      .sort((a, b) => a.meta.position.x - b.meta.position.x);
    const cols: { x: number; items: any[] }[] = [];
    for (const node of positioned) {
      const last = cols[cols.length - 1];
      if (last && Math.abs(node.meta.position.x - last.x) < COL_TOL) {
        last.x = (last.x * last.items.length + node.meta.position.x) / (last.items.length + 1);
        last.items.push(node);
      } else {
        cols.push({ x: node.meta.position.x, items: [node] });
      }
    }
    for (const col of cols) col.items.sort((a, b) => a.meta.position.y - b.meta.position.y);

    // 2) 无坐标节点（服务端增量新增）：挂到入边源所在列的下一列末尾；依赖未就绪等下一轮
    const colOf = new Map<string, number>();
    cols.forEach((col, ci) => col.items.forEach((n) => colOf.set(n.id, ci)));
    const rest = rawNodes.filter((n) => !hasPos(n));
    for (let pass = 0; rest.length > 0 && pass < 10; pass++) {
      for (let i = rest.length - 1; i >= 0; i--) {
        const node = rest[i];
        const incoming = rawEdges.find(
          (e) => e.targetNodeID === node.id && colOf.has(e.sourceNodeID)
        );
        if (!incoming) continue;
        const target = colOf.get(incoming.sourceNodeID)! + 1;
        while (cols.length <= target) cols.push({ x: 0, items: [] });
        cols[target].items.push(node);
        colOf.set(node.id, target);
        rest.splice(i, 1);
      }
    }
    // 3) 仍无锚点的（孤立/起点）→ 各开一列排最右
    for (const node of rest) cols.push({ x: 0, items: [node] });

    // 4) 生成紧凑坐标：列横向等距、列内围绕画布垂直中心对称展开
    const boxes: NodeBox[] = [];
    cols.forEach((col, ci) => {
      const n = col.items.length;
      col.items.forEach((node, j) => {
        boxes.push({
          id: node.id,
          title: String(node?.data?.title || node?.type || node.id || ''),
          type: String(node?.type || ''),
          x: ci * (BADGE_W + GAP_COL),
          y: (j - (n - 1) / 2) * (BADGE_H + GAP_ROW),
        });
      });
    });
    const byId = new Map(boxes.map((b) => [b.id, b]));

    // 布局框：全部节点的外包矩形
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const b of boxes) {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + BADGE_W);
      maxY = Math.max(maxY, b.y + BADGE_H);
    }
    if (!Number.isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 400;
      maxY = 200;
    }
    const vb: ViewBox = {
      x: minX - VB_PAD,
      y: minY - VB_PAD,
      w: maxX - minX + VB_PAD * 2,
      h: maxY - minY + VB_PAD * 2,
    };

    return {
      nodes: boxes,
      edges: rawEdges
        .filter((e) => byId.has(e.sourceNodeID) && byId.has(e.targetNodeID))
        .map((e) => ({
          from: byId.get(e.sourceNodeID)!,
          to: byId.get(e.targetNodeID)!,
          port: e.sourcePortID,
        })),
      viewBox: vb,
    };
  }, [dsl]);

  // ===== 视口（transform 只影响渲染层；未冻结时 viewBox 恒为 fit 布局框） =====
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<ViewState>(HOME_VIEW);
  const viewRef = useRef(view);
  viewRef.current = view;

  // 冻结机制：liveVB 每次渲染跟随最新 fit；用户交互后 frozenVB 固定，流式扩展布局不再晃动视口
  const liveVBRef = useRef(viewBox);
  liveVBRef.current = viewBox;
  const frozenVBRef = useRef<ViewBox | null>(null);
  const renderVB = frozenVBRef.current ?? viewBox;
  const freezeVB = useCallback(() => {
    frozenVBRef.current ??= liveVBRef.current;
  }, []);

  const dragRef = useRef<{ px: number; py: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  /** fit 比例：屏幕 px / viewBox 用户单位（preserveAspectRatio=meet 含 letterbox） */
  const fitScale = useCallback(() => {
    const el = svgRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return Math.min(rect.width / renderVB.w, rect.height / renderVB.h);
  }, [renderVB]);

  /** 屏幕坐标 → SVG 坐标（meet 有 letterbox，需先解出实际缩放与偏移） */
  const clientToSvg = useCallback(
    (cx: number, cy: number) => {
      const el = svgRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const k = Math.min(rect.width / renderVB.w, rect.height / renderVB.h);
      const ox = (rect.width - renderVB.w * k) / 2;
      const oy = (rect.height - renderVB.h * k) / 2;
      return {
        x: (cx - rect.left - ox) / k + renderVB.x,
        y: (cy - rect.top - oy) / k + renderVB.y,
      };
    },
    [renderVB]
  );

  // ===== 程序化缩放补间（仅按钮/复位使用；wheel 与拖拽中断它改为直接跟手） =====
  const rafRef = useRef<{ raf: number; fallback: number } | null>(null);
  const stopAnim = useCallback(() => {
    const ids = rafRef.current;
    if (ids) {
      cancelAnimationFrame(ids.raf);
      clearTimeout(ids.fallback);
      rafRef.current = null;
    }
  }, []);
  useEffect(() => stopAnim, [stopAnim]);

  /** ~180ms ease-out 补间：zoom 走对数空间（缩放匀速感），pan 线性 */
  const animateTo = useCallback(
    (target: ViewState) => {
      stopAnim();
      const from = viewRef.current;
      const fromLog = Math.log(from.zoom);
      const toLog = Math.log(clampZoom(target.zoom));
      const start = performance.now();
      const rafIds = { raf: 0, fallback: 0 };
      const finish = () => {
        cancelAnimationFrame(rafIds.raf);
        clearTimeout(rafIds.fallback);
        rafRef.current = null;
      };
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ANIM_MS);
        const e = 1 - Math.pow(1 - t, 3);
        setView({
          zoom: Math.exp(fromLog + (toLog - fromLog) * e),
          panX: from.panX + (target.panX - from.panX) * e,
          panY: from.panY + (target.panY - from.panY) * e,
        });
        if (t < 1) rafIds.raf = requestAnimationFrame(step);
        else finish();
      };
      rafIds.raf = requestAnimationFrame(step);
      // rAF 被节流（如页面切到后台）时强制完成终态，避免视口停在半路
      rafIds.fallback = window.setTimeout(() => {
        if (rafRef.current === rafIds) {
          finish();
          setView({ zoom: Math.exp(toLog), panX: target.panX, panY: target.panY });
        }
      }, ANIM_MS + 120);
      rafRef.current = rafIds;
    },
    [stopAnim]
  );

  /** 以 SVG 坐标 p 为锚缩放：保持锚点下内容不动（单次原子更新，StrictMode 下无重复副作用） */
  const zoomAt = useCallback((p: { x: number; y: number }, factor: number) => {
    setView((v) => {
      const next = clampZoom(v.zoom * factor);
      if (next === v.zoom) return v;
      const applied = next / v.zoom;
      return {
        zoom: next,
        panX: p.x - (p.x - v.panX) * applied,
        panY: p.y - (p.y - v.panY) * applied,
      };
    });
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    setView((v) => ({ ...v, panX: v.panX + dx, panY: v.panY + dy }));
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const el = svgRef.current;
      let center: { x: number; y: number } | null = null;
      if (el) {
        const rect = el.getBoundingClientRect();
        center = clientToSvg(rect.left + el.clientWidth / 2, rect.top + el.clientHeight / 2);
      }
      const cur = viewRef.current;
      const next = clampZoom(cur.zoom * factor);
      if (next === cur.zoom) return;
      const applied = next / cur.zoom;
      animateTo(
        center
          ? {
              zoom: next,
              panX: center.x - (center.x - cur.panX) * applied,
              panY: center.y - (center.y - cur.panY) * applied,
            }
          : { ...cur, zoom: next }
      );
    },
    [clientToSvg, animateTo]
  );

  /** 回 fit-all：解冻 + 复位。冻结期间坐标系已切换，直接整帧复位避免补间中途跳变 */
  const resetView = useCallback(() => {
    const wasFrozen = frozenVBRef.current != null;
    frozenVBRef.current = null;
    stopAnim();
    if (wasFrozen) setView(HOME_VIEW);
    else animateTo(HOME_VIEW);
  }, [animateTo, stopAnim]);

  // wheel 需 preventDefault（接管手势而非滚动容器），必须是非被动监听
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      freezeVB();
      stopAnim();
      if (e.ctrlKey || e.metaKey) {
        // 触控板捏合（浏览器合成 ctrl+wheel）/ ⌘·Ctrl+滚轮 → 以光标为锚连续缩放
        const p = clientToSvg(e.clientX, e.clientY);
        if (!p) return;
        const dy = wheelDeltaToPx(e);
        zoomAt(p, Math.exp(-clamp(dy, -MAX_WHEEL_DELTA, MAX_WHEEL_DELTA) * WHEEL_SENSITIVITY));
      } else {
        // 普通滚轮 / 两指滚动 → 平移。方向对齐 /editor 编辑器（flowgram/d3 相机语义）：
        // 两指下滑 = 视口下移 = 内容上移（与拖拽画布的「抓内容」方向相反，同页面滚动直觉）
        const k = fitScale();
        if (!k) return;
        panBy(-e.deltaX / k, -e.deltaY / k);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [clientToSvg, fitScale, zoomAt, panBy, freezeVB, stopAnim]);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    freezeVB();
    stopAnim();
    dragRef.current = { px: e.clientX, py: e.clientY };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const k = fitScale();
    if (!k) return;
    setView((v) => ({
      ...v,
      panX: v.panX + (e.clientX - d.px) / k,
      panY: v.panY + (e.clientY - d.py) / k,
    }));
    dragRef.current = { px: e.clientX, py: e.clientY };
  };
  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  // ===== 连线：双端扇形错位 + 按水平间距伸缩的贝塞尔 =====
  // 同源多出边在起点对称展开，同汇多入边在终点对称展开，避免多线怼进同一点交叉打结
  const fanOffsets = useMemo(() => {
    const outTotal = new Map<string, number>();
    const inTotal = new Map<string, number>();
    for (const e of edges) {
      outTotal.set(e.from.id, (outTotal.get(e.from.id) || 0) + 1);
      inTotal.set(e.to.id, (inTotal.get(e.to.id) || 0) + 1);
    }
    const outSeen = new Map<string, number>();
    const inSeen = new Map<string, number>();
    const offsets = new Map<string, { out: number; in: number }>();
    for (const e of edges) {
      const key = `${e.from.id}->${e.to.id}${e.port ? '#' + e.port : ''}`;
      const oi = outSeen.get(e.from.id) || 0;
      const ii = inSeen.get(e.to.id) || 0;
      outSeen.set(e.from.id, oi + 1);
      inSeen.set(e.to.id, ii + 1);
      offsets.set(key, {
        out: (oi - ((outTotal.get(e.from.id) || 1) - 1) / 2) * EDGE_OUT_GAP,
        in: (ii - ((inTotal.get(e.to.id) || 1) - 1) / 2) * EDGE_IN_GAP,
      });
    }
    return offsets;
  }, [edges]);

  const edgePaths = useMemo(
    () =>
      edges.map((e) => {
        const key = `${e.from.id}->${e.to.id}${e.port ? '#' + e.port : ''}`;
        const fan = fanOffsets.get(key) || { out: 0, in: 0 };
        const x1 = e.from.x + BADGE_W;
        const y1 = e.from.y + BADGE_H / 2 + fan.out;
        const x2 = e.to.x;
        const y2 = e.to.y + BADGE_H / 2 + fan.in;
        // d3 linkHorizontal 风格：控制点从端点水平伸出，大纵向跨度的边平滑过渡而非中点陡坠
        const d = clamp((x2 - x1) * 0.5, CTRL_MIN, CTRL_MAX);
        return { key, d: `M ${x1} ${y1} C ${x1 + d} ${y1}, ${x2 - d} ${y2}, ${x2 - 3} ${y2}` };
      }),
    [edges, fanOffsets]
  );

  const zoomPct = Math.round(view.zoom * 100);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={`${renderVB.x} ${renderVB.y} ${renderVB.w} ${renderVB.h}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`工作流预览：${nodes.length} 节点`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onDoubleClick={resetView}
      >
        <defs>
          {/* V 形开放箭头（同 /editor 编辑器风格）；marker 不继承外部 stroke，需自带颜色 */}
          <marker
            id="gaia-lc-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="6.5"
            refY="3.5"
            orient="auto"
          >
            <path
              d="M1,1 L6.5,3.5 L1,6"
              fill="none"
              stroke={LINE_COLOR}
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>
        <g transform={`translate(${view.panX} ${view.panY}) scale(${view.zoom})`}>
          {edgePaths.map((p) => (
            <path
              key={p.key}
              d={p.d}
              fill="none"
              stroke={LINE_COLOR}
              strokeWidth={LINE_WIDTH}
              markerEnd="url(#gaia-lc-arrow)"
            />
          ))}
          {nodes.map((n) => {
            const color = typeColor(n.type);
            const cy = n.y + BADGE_H / 2;
            return (
              <g key={n.id}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={BADGE_W}
                  height={BADGE_H}
                  rx="8"
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth="1.2"
                />
                <circle cx={n.x + 12} cy={cy} r="4" fill={color.stroke} />
                <text
                  x={n.x + 22}
                  y={cy}
                  fontSize="9"
                  fill="var(--g-text, #334155)"
                  style={{ fontWeight: 600 }}
                  dominantBaseline="central"
                >
                  {n.title.length > 10 ? `${n.title.slice(0, 9)}…` : n.title}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* 缩放控件：放大 / 百分比 / 缩小 / 适应画布 */}
      <div
        style={{
          position: 'absolute',
          right: 10,
          bottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '2px 4px',
          borderRadius: 8,
          background: 'var(--g-bg-raised, #fff)',
          border: '1px solid rgba(148,163,184,0.35)',
          boxShadow: '0 2px 8px rgba(15,23,42,0.10)',
        }}
      >
        <button
          type="button"
          aria-label={t('canvas.zoomOut')}
          title={t('canvas.zoomOut')}
          onClick={() => zoomBy(1 / ZOOM_STEP)}
          style={{
            width: 24,
            height: 24,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--g-text, #334155)',
            fontSize: 15,
            lineHeight: 1,
            borderRadius: 5,
          }}
        >
          −
        </button>
        <span
          onClick={resetView}
          title={t('canvas.resetZoom')}
          style={{
            minWidth: 38,
            textAlign: 'center',
            cursor: 'pointer',
            fontSize: 11,
            color: 'var(--g-text, #334155)',
            userSelect: 'none',
          }}
        >
          {zoomPct}%
        </span>
        <button
          type="button"
          aria-label={t('canvas.zoomIn')}
          title={t('canvas.zoomIn')}
          onClick={() => zoomBy(ZOOM_STEP)}
          style={{
            width: 24,
            height: 24,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--g-text, #334155)',
            fontSize: 15,
            lineHeight: 1,
            borderRadius: 5,
          }}
        >
          +
        </button>
        <button
          type="button"
          aria-label={t('canvas.fitView')}
          title="适应画布（重置缩放与平移）"
          onClick={resetView}
          style={{
            width: 24,
            height: 24,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--g-text, #334155)',
            fontSize: 12,
            lineHeight: 1,
            borderRadius: 5,
          }}
        >
          ⤢
        </button>
      </div>
    </div>
  );
};

export default LightCanvas;
