/**
 * 轻量 SVG 图表（无第三方依赖，响应式靠 viewBox + 100% 宽度）。
 * 用于调用数据看板：折线（趋势/耗时）、环形（成功/失败）、条形（失败明细）、指标卡。
 *
 * 这一版是可交互的：
 *  - 折线：悬停出十字线与数值气泡，点某个数据点可下钻（onPointClick）
 *  - 条形：悬停高亮、点击选中（onSelect），选中项加描边
 *  - 环形：悬停/点击某一段（onSelect）
 *  - 指标卡：可点（onClick）并显示选中态
 */
import React, { useRef, useState } from 'react';

const ACCENT = '#4d53e8';
const RED = '#f0484b';
const GREEN = '#18a058';
const GRID = '#eee';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const StatCard: React.FC<{
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
  onClick?: () => void;
  active?: boolean;
  hint?: string;
}> = ({ label, value, unit, accent, onClick, active, hint }) => (
  <div
    onClick={onClick}
    className={`rounded-2xl border bg-white p-5 transition-all ${
      onClick ? 'cursor-pointer hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)]' : ''
    }`}
    style={{
      borderColor: active ? ACCENT : '#eee',
      boxShadow: active ? `0 0 0 1px ${ACCENT} inset` : undefined,
    }}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
  >
    <div className="text-[13px] text-[#888]">{label}</div>
    <div className="mt-2 flex items-baseline gap-1">
      <span className="text-3xl font-bold" style={{ color: accent || '#1a1a1a' }}>
        {value}
      </span>
      {unit && <span className="text-sm text-[#999]">{unit}</span>}
    </div>
    {hint && <div className="mt-1 text-[11px] text-[#aaa]">{hint}</div>}
  </div>
);

export const ChartCard: React.FC<{
  title: string;
  children: React.ReactNode;
  hint?: string;
  right?: React.ReactNode;
}> = ({ title, children, hint, right }) => (
  <div className="rounded-2xl border border-[#eee] bg-white p-5">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="text-[14px] font-semibold text-[#1a1a1a]">{title}</div>
      {right || (hint && <div className="text-[12px] text-[#aaa]">{hint}</div>)}
    </div>
    {children}
  </div>
);

/** 分段选择器（时间范围等） */
export const Segmented: React.FC<{
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="inline-flex rounded-lg border border-[#eee] bg-[#fafafc] p-0.5">
    {options.map((o) => (
      <button
        key={o.value}
        onClick={() => onChange(o.value)}
        className="rounded-md px-3 py-1 text-[12px] font-medium transition-colors"
        style={
          o.value === value
            ? { background: '#fff', color: ACCENT, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
            : { color: '#777' }
        }
      >
        {o.label}
      </button>
    ))}
  </div>
);

const buildPath = (values: number[], w: number, h: number, padL: number, padR: number, padT: number, padB: number, max: number) => {
  const n = values.length;
  if (n === 0) return '';
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const step = n > 1 ? innerW / (n - 1) : 0;
  return values
    .map((v, i) => {
      const x = padL + i * step;
      const y = padT + innerH - (max === 0 ? 0 : (v / max) * innerH);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
};

export const MiniLineChart: React.FC<{
  labels: string[];
  series: { name?: string; values: number[]; color: string; fill?: boolean; unit?: string }[];
  height?: number;
  /** 点击某个数据点时回调（用于下钻） */
  onPointClick?: (index: number) => void;
  /** x 轴标签是否只显示 月-日（默认 true） */
  shortLabels?: boolean;
}> = ({ labels, series, height = 220, onPointClick, shortLabels = true }) => {
  const W = 680;
  const H = height;
  const padL = 38;
  const padR = 14;
  const padT = 16;
  const padB = 28;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const n = labels.length;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const innerW = W - padL - padR;
  const step = n > 1 ? innerW / (n - 1) : 0;
  const xTick = (i: number) => padL + i * step;
  const yOf = (v: number) => padT + (H - padT - padB) - (max === 0 ? 0 : (v / max) * (H - padT - padB));

  const onMove = (e: React.MouseEvent) => {
    const el = wrapRef.current;
    if (!el || n === 0 || step === 0) return;
    const rect = el.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    setHover(clamp(Math.round((vx - padL) / step), 0, n - 1));
  };

  return (
    <div ref={wrapRef} className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img">
        {[0, 0.25, 0.5, 0.75, 1].map((g) => {
          const y = padT + (H - padT - padB) * g;
          return (
            <g key={g}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={GRID} strokeWidth={1} />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={10} fill="#bbb">
                {Math.round(max * (1 - g))}
              </text>
            </g>
          );
        })}

        {/* 悬停十字线 */}
        {hover !== null && n > 0 && (
          <line x1={xTick(hover)} y1={padT} x2={xTick(hover)} y2={H - padB} stroke="#c9c9ff" strokeWidth={1} strokeDasharray="3 3" />
        )}

        {series.map((s, si) => {
          const d = buildPath(s.values, W, H, padL, padR, padT, padB, max);
          return (
            <g key={si}>
              {s.fill && (
                <path
                  d={`${d} L${padL + (n > 1 ? innerW : 0)},${H - padB} L${padL},${H - padB} Z`}
                  fill={s.color}
                  opacity={0.1}
                />
              )}
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {/* 悬停点 */}
              {hover !== null && n > 0 && (
                <circle cx={xTick(hover)} cy={yOf(s.values[hover] ?? 0)} r={4} fill="#fff" stroke={s.color} strokeWidth={2} />
              )}
            </g>
          );
        })}

        {/* 点击热区 */}
        {onPointClick &&
          labels.map((_, i) => (
            <rect
              key={i}
              x={xTick(i) - (step || innerW) / 2}
              y={0}
              width={step || innerW}
              height={H}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => onPointClick(i)}
            />
          ))}

        {/* x 轴刻度：最多 6 个 */}
        {n > 0 &&
          Array.from({ length: Math.min(6, n) }).map((_, k) => {
            const i = Math.round((k / Math.max(1, Math.min(6, n) - 1)) * (n - 1));
            return (
              <text key={k} x={xTick(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="#bbb">
                {shortLabels ? labels[i]?.slice(5) : labels[i]}
              </text>
            );
          })}
      </svg>

      {/* 悬停气泡 */}
      {hover !== null && n > 0 && (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-[#eee] bg-white px-3 py-2 text-[12px] shadow-[0_6px_20px_rgba(0,0,0,0.1)]"
          style={{
            left: `${(xTick(hover) / W) * 100}%`,
            top: 4,
            transform: `translateX(${hover > n / 2 ? '-100%' : '0'}) translateX(${hover > n / 2 ? -8 : 8}px)`,
          }}
        >
          <div className="mb-1 font-medium text-[#333]">{labels[hover]}</div>
          {series.length === 0 && <div className="text-[#999]">—</div>}
          {series.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} />
              {s.name && <span className="text-[#777]">{s.name}</span>}
              <span className="ml-auto pl-3 font-medium text-[#333]">
                {s.values[hover] ?? 0}
                {s.unit || ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const DonutChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  /** 圆心显示的主数值；缺省显示各段合计 */
  centerValue?: string | number;
  /** 圆心主数值下方的说明文字 */
  centerLabel?: string;
  /** 点击某一段 / 图例项 */
  onSelect?: (label: string) => void;
  selected?: string;
}> = ({ data, centerValue, centerLabel, onSelect, selected }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const size = 180;
  const r = 70;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f2" strokeWidth={18} />
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {total > 0 &&
            data.map((d, i) => {
              const len = (d.value / total) * C;
              const dim = selected ? selected !== d.label : false;
              const el = (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={hoverIdx === i ? 22 : 18}
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-offset}
                  opacity={dim ? 0.35 : 1}
                  style={{ cursor: onSelect ? 'pointer' : 'default', transition: 'stroke-width .12s' }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  onClick={() => onSelect?.(d.label)}
                />
              );
              offset += len;
              return el;
            })}
        </g>
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={22} fontWeight={700} fill="#1a1a1a">
          {hoverIdx !== null ? data[hoverIdx].value : centerValue !== undefined ? centerValue : total}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize={11} fill="#999">
          {total === 0 ? '—' : hoverIdx !== null ? data[hoverIdx].label : centerLabel || 'total'}
        </text>
      </svg>
      <div className="flex-1 space-y-1.5">
        {data.length === 0 && <div className="text-sm text-[#999]">—</div>}
        {data.map((d, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 rounded-md px-2 py-1 text-[13px] ${
              onSelect ? 'cursor-pointer hover:bg-[#f7f7fb]' : ''
            }`}
            style={selected === d.label ? { background: '#f3f3ff' } : undefined}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={() => onSelect?.(d.label)}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, display: 'inline-block' }} />
            <span className="flex-1 truncate text-[#555]">{d.label}</span>
            <span className="font-medium text-[#333]">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const BarChart: React.FC<{
  data: { label: string; value: number; color?: string }[];
  onSelect?: (index: number) => void;
  selected?: number | null;
}> = ({ data, onSelect, selected = null }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 680;
  const rowH = 32;
  const H = Math.max(rowH, data.length * rowH);
  const labelW = 200;
  const barW = W - labelW - 60;
  const [hover, setHover] = useState<number | null>(null);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img">
      {data.map((d, i) => {
        const y = i * rowH + 7;
        const w = (d.value / max) * barW;
        const isActive = selected === i || hover === i;
        return (
          <g
            key={i}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onSelect?.(i)}
          >
            <rect x={0} y={i * rowH} width={W} height={rowH} fill={isActive ? '#f7f7fb' : 'transparent'} />
            <text x={0} y={y + 14} fontSize={12} fill={isActive ? '#1a1a1a' : '#555'} dominantBaseline="middle">
              {d.label.length > 26 ? d.label.slice(0, 25) + '…' : d.label}
            </text>
            <rect x={labelW} y={y} width={barW} height={18} rx={4} fill="#f4f4f6" />
            <rect
              x={labelW}
              y={y}
              width={w}
              height={18}
              rx={4}
              fill={d.color || ACCENT}
              stroke={selected === i ? '#1a1a1a' : 'none'}
              strokeWidth={selected === i ? 1 : 0}
            />
            <text x={labelW + w + 8} y={y + 14} fontSize={12} fill="#666" dominantBaseline="middle">
              {d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const COLORS = { ACCENT, RED, GREEN };
