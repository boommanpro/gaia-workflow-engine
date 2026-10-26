/**
 * LightCanvas —— 产物面板的轻量只读画布预览（纯 SVG 自绘，可缩放/平移）。
 *
 * 取代旧 ReadonlyCanvas（整个 flowgram 编辑器实例随 key 重挂）：
 * remount 风暴曾是「页面无响应」的直接元凶（IoC 容器 + 全部插件 + 每节点表单）。
 * 预览只需要表达「有哪些节点、怎么连」，SVG 全量重绘 ~50 节点在 5ms 内，
 * 增长中的工作流可以每个 document 事件都刷新，不再需要 3 秒采样节流。
 * 完整交互编辑只在 /editor 页面的真实编辑器里发生。
 *
 * 缩放视图：节点多时 fit-all 太小，支持滚轮缩放（以指针为锚）、拖拽平移、
 * 右下角控件（+/-/适应画布）。变换挂在根 <g transform> 上，不参与布局计算；
 * AI 流式新增节点改变布局框时不重置用户视角，「适应画布」一键回 fit。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

const NODE_W = 168;
const NODE_H = 52;
const GAP_X = 96;
const GAP_Y = 28;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 1.2;

function typeColor(type: string): { fill: string; stroke: string } {
  switch (type) {
    case 'start':
      return { fill: 'rgba(59,130,246,0.10)', stroke: '#3b82f6' };
    case 'end':
      return { fill: 'rgba(34,197,94,0.10)', stroke: '#22c55e' };
    case 'llm':
      return { fill: 'rgba(168,85,247,0.10)', stroke: '#a855f7' };
    case 'http':
      return { fill: 'rgba(14,165,233,0.10)', stroke: '#0ea5e9' };
    case 'code':
      return { fill: 'rgba(20,184,166,0.10)', stroke: '#14b8a6' };
    case 'condition':
      return { fill: 'rgba(245,158,11,0.12)', stroke: '#f59e0b' };
    case 'loop':
      return { fill: 'rgba(244,63,94,0.08)', stroke: '#f43f5e' };
    default:
      return { fill: 'rgba(148,163,184,0.10)', stroke: '#94a3b8' };
  }
}

const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

export const LightCanvas: React.FC<{ dsl: WorkflowDsl }> = ({ dsl }) => {
  const { nodes, edges, viewBox } = useMemo(() => {
    const rawNodes = (dsl?.nodes || []) as any[];
    const rawEdges = (dsl?.edges || []) as any[];
    const positioned = new Map<string, { x: number; y: number }>();
    const pending: any[] = [];
    for (const node of rawNodes) {
      const pos = node?.meta?.position;
      if (Number.isFinite(pos?.x) && Number.isFinite(pos?.y)) {
        positioned.set(node.id, { x: pos.x, y: pos.y });
      } else {
        pending.push(node);
      }
    }
    // 无坐标节点（服务端增量新增）：按入链拓扑就近排布 —— 找不到上游就网格排到右侧
    const COL = 6;
    pending.forEach((node, i) => {
      const incoming = rawEdges.find((e) => e.targetNodeID === node.id);
      const anchor = incoming ? positioned.get(incoming.sourceNodeID) : undefined;
      const col = Math.floor(i / COL);
      const row = i % COL;
      positioned.set(
        node.id,
        anchor
          ? { x: anchor.x + NODE_W + GAP_X, y: anchor.y + (row - 1) * (NODE_H + GAP_Y) }
          : { x: 220 + (col + 1) * (NODE_W + GAP_X), y: 160 + row * (NODE_H + GAP_Y) }
      );
    });

    const boxes: NodeBox[] = rawNodes.map((node) => {
      const pos = positioned.get(node.id) || { x: 0, y: 0 };
      const title = String(node?.data?.title || node?.type || node.id || '');
      return { id: node.id, title, type: String(node?.type || ''), x: pos.x, y: pos.y };
    });
    const byId = new Map(boxes.map((b) => [b.id, b]));

    // 布局框：全部节点的外包矩形 + 出边扇形
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const b of boxes) {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + NODE_W);
      maxY = Math.max(maxY, b.y + NODE_H);
    }
    if (!Number.isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 400;
      maxY = 200;
    }
    const pad = 48;
    const vb: ViewBox = {
      x: minX - pad,
      y: minY - pad,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
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

  // 出边扇形：同源多出边（condition 分支）在起点纵向错开
  const portOffset = useMemo(() => {
    const counts = new Map<string, number>();
    const offsets = new Map<string, number>();
    for (const e of edges) {
      const n = counts.get(e.from.id) || 0;
      counts.set(e.from.id, n + 1);
      offsets.set(`${e.from.id}->${e.to.id}${e.port ? '#' + e.port : ''}`, (n - 0.5) * 16);
    }
    return offsets;
  }, [edges]);

  // ===== 缩放/平移（transform 只影响渲染层，viewBox 恒为 fit 布局框） =====
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ px: number; py: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  /** 屏幕坐标 → SVG 坐标（preserveAspectRatio=meet 有 letterbox，需先解出实际缩放与偏移） */
  const clientToSvg = useCallback(
    (cx: number, cy: number) => {
      const el = svgRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const k = Math.min(rect.width / viewBox.w, rect.height / viewBox.h);
      const ox = (rect.width - viewBox.w * k) / 2;
      const oy = (rect.height - viewBox.h * k) / 2;
      return {
        x: (cx - rect.left - ox) / k + viewBox.x,
        y: (cy - rect.top - oy) / k + viewBox.y,
        k,
      };
    },
    [viewBox]
  );

  /** 以 SVG 坐标 p 为锚缩放：保持锚点下内容不动 */
  const zoomAt = useCallback((p: { x: number; y: number }, factor: number) => {
    setZoom((z) => {
      const next = clampZoom(z * factor);
      if (next === z) return z;
      const applied = next / z;
      setPan((t) => ({ x: p.x - (p.x - t.x) * applied, y: p.y - (p.y - t.y) * applied }));
      return next;
    });
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const el = svgRef.current;
      const center = el
        ? clientToSvg(
            el.getBoundingClientRect().left + el.clientWidth / 2,
            el.getBoundingClientRect().top + el.clientHeight / 2
          )
        : null;
      if (center) {
        zoomAt(center, factor);
      } else {
        setZoom((z) => clampZoom(z * factor));
      }
    },
    [clientToSvg, zoomAt]
  );

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // wheel 需 preventDefault（滚轮缩放而非滚动画布容器），必须是非被动监听
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = clientToSvg(e.clientX, e.clientY);
      if (!p) return;
      zoomAt(p, e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [clientToSvg, zoomAt]);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    dragRef.current = { px: e.clientX, py: e.clientY };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const k = Math.min(rect.width / viewBox.w, rect.height / viewBox.h);
    setPan((t) => ({ x: t.x + (e.clientX - d.px) / k, y: t.y + (e.clientY - d.py) / k }));
    dragRef.current = { px: e.clientX, py: e.clientY };
  };
  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const zoomPct = Math.round(zoom * 100);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
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
          <marker
            id="gaia-lc-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 z" fill="rgba(148,163,184,0.9)" />
          </marker>
        </defs>
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {edges.map((e) => {
            const dy = portOffset.get(`${e.from.id}->${e.to.id}${e.port ? '#' + e.port : ''}`) || 0;
            const x1 = e.from.x + NODE_W;
            const y1 = e.from.y + NODE_H / 2 + dy;
            const x2 = e.to.x;
            const y2 = e.to.y + NODE_H / 2;
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={`${e.from.id}->${e.to.id}${e.port ? '#' + e.port : ''}`}
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2 - 4} ${y2}`}
                fill="none"
                stroke="rgba(148,163,184,0.65)"
                strokeWidth="1.6"
                markerEnd="url(#gaia-lc-arrow)"
              />
            );
          })}
          {nodes.map((n) => {
            const color = typeColor(n.type);
            return (
              <g key={n.id}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx="10"
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth="1.4"
                />
                <text
                  x={n.x + 12}
                  y={n.y + 20}
                  fontSize="10"
                  fill="rgba(148,163,184,1)"
                  letterSpacing="0.4"
                >
                  {n.type.toUpperCase()}
                </text>
                <text
                  x={n.x + 12}
                  y={n.y + 38}
                  fontSize="12.5"
                  fill="var(--g-text, #334155)"
                  style={{ fontWeight: 600 }}
                >
                  {n.title.length > 14 ? `${n.title.slice(0, 13)}…` : n.title}
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
          aria-label="缩小"
          title="缩小"
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
          title="点击恢复 100%"
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
          aria-label="放大"
          title="放大"
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
          aria-label="适应画布"
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
