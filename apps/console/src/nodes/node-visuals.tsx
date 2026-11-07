/**
 * 节点视觉单源（P-01）：节点图标、分类色、画布副标题统一在这里定义，
 * 节点头（form-header）、节点面板、LightCanvas 全部从本模块派生，
 * 不再各自维护 img 资源或平行色板（替代 assets/icon-*.jpg/png 与 LightCanvas.typeColor）。
 *
 * 图标为 24×24 线性描边 SVG（stroke 2 / round），几何取自 Lucide 1.17 与定制图形（2026-11-06 选稿定稿）；
 * chip 呈现为实底分类色块 + 白色图形（.gaia-node-chip），分类色仍经 CSS 变量派生深浅主题。
 */
import type { FlowNodeEntity } from '@flowgram.ai/free-layout-editor';

import { t } from '../i18n';
import { WorkflowNodeType } from './constants';

/** 节点分类：色板与图标分组共用（视觉稿 2026-11-03「节点图标」页签定稿） */
export type NodeCategory = 'flow' | 'model' | 'logic' | 'data' | 'integration' | 'canvas';

export const NODE_CATEGORY_COLORS: Record<NodeCategory, { light: string; dark: string }> = {
  flow: { light: '#2f7df6', dark: '#6ea8ff' },
  model: { light: '#7c5cff', dark: '#a58bff' },
  logic: { light: '#d97706', dark: '#f0a04b' },
  data: { light: '#0e9384', dark: '#3ecfbb' },
  integration: { light: '#0ea5e9', dark: '#53c1f5' },
  canvas: { light: '#737a89', dark: '#9aa1b0' },
};

export const NODE_CATEGORY_LABELS: Record<NodeCategory, string> = {
  flow: '起止',
  model: '模型',
  logic: '逻辑控制',
  data: '数据处理',
  integration: '集成',
  canvas: '画布元素',
};

/* ---------------- 线性图标（currentColor；chip 实底分类色 + 白色前景，见 .gaia-node-chip） ----------------
 * 图形几何：Lucide 1.17 官方线条 + 定制图形，2026-11-06 选稿定稿（视觉稿见会话记录）。 */

type IconProps = { size?: number };
const svgProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

const Play = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
  </svg>
);
const ArrowDownToDot = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M12 2v14" />
    <path d="m19 9-7 7-7-7" />
    <circle cx="12" cy="21" r="1" />
  </svg>
);
const ArrowUpFromDot = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="m5 9 7-7 7 7" />
    <path d="M12 16V2" />
    <circle cx="12" cy="21" r="1" />
  </svg>
);
const Power = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M12 2v10" />
    <path d="M18.4 6.6a9 9 0 1 1-12.77.04" />
  </svg>
);
const Bot = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
);
const Globe = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);
const Terminal = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M12 19h8" />
    <path d="m4 17 6-6-6-6" />
  </svg>
);
const Braces = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" />
    <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
  </svg>
);
const GitBranch = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M15 6a9 9 0 0 0-9 9V3" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
  </svg>
);
const GitFork = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <circle cx="12" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="6" r="3" />
    <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" />
    <path d="M12 12v3" />
  </svg>
);
const RotateCw = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);
const FastForward = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M12 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 12 18z" />
    <path d="M2 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 2 18z" />
  </svg>
);
const Ban = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M4.929 4.929 19.07 19.071" />
  </svg>
);
const TypeIcon = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M4.5 7V4.5h15V7" />
    <path d="M12 4.5v15" />
    <path d="M9 19.5h6" />
  </svg>
);
const WorkflowIcon = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <rect x="3.2" y="3.6" width="6.2" height="4.8" rx="1.4" />
    <rect x="14.6" y="3.6" width="6.2" height="4.8" rx="1.4" />
    <rect x="8.9" y="15.6" width="6.2" height="4.8" rx="1.4" />
    <path d="M6.3 8.4v3.2h11.4V8.4" />
    <path d="M12 11.6v4" />
  </svg>
);
const MessageSquare = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
  </svg>
);
const StickyNote = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M4 5h16v9l-5 5H4z" />
    <path d="M20 14h-5v5" />
  </svg>
);
const GroupBox = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <rect x="3.4" y="4.1" width="17.2" height="15.8" rx="2.6" strokeDasharray="3.2 3.4" />
  </svg>
);

export type NodeIcon = React.FC<{ size?: number }>;

export interface NodeVisual {
  category: NodeCategory;
  Icon: NodeIcon;
  /** 画布节点头下方的一行摘要（无则不显示） */
  subtitle?: (node: FlowNodeEntity) => string | undefined;
}

const asString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;

/**
 * 包装值（constant/template/ref/expression 的 {type,content}）→ 展示字符串；
 * 裸字符串原样返回。字段形状以 node-schemas 为源（NC-04），这里只做只读展开。
 */
const unwrapValue = (v: unknown): string | undefined => {
  const s = asString(v);
  if (s !== undefined) return s;
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const content = (v as { content?: unknown }).content;
    if (typeof content === 'string') return asString(content);
    if (typeof content === 'number' || typeof content === 'boolean') return String(content);
  }
  return undefined;
};

/** ref 值（content 为 [节点id, ...字段路径]）→ 字段路径展示（去掉节点 id 首段） */
const refPath = (v: unknown): string | undefined => {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const content = (v as { content?: unknown }).content;
    if (Array.isArray(content) && content.length > 1) {
      return content.slice(1).map(String).join('.');
    }
  }
  return undefined;
};

/** 副标题取数：只读展示，不复制业务规则（NC-04），失败静默返回 undefined */
const firstSegment = (v: unknown): string | undefined => {
  const s = unwrapValue(v);
  if (!s) return undefined;
  const firstLine = s.split('\n')[0];
  return firstLine.length > 40 ? `${firstLine.slice(0, 40)}…` : firstLine;
};

const propKeys = (props: unknown): string[] => {
  if (!props || typeof props !== 'object' || Array.isArray(props)) return [];
  return Object.keys(props as Record<string, unknown>);
};

/** 变量名列表摘要：前 3 个以 · 连接，更多以 … 收尾（展示内容本身，不做「N 项」式计数） */
const joinNames = (keys: string[]): string | undefined => {
  if (!keys.length) return undefined;
  const head = keys.slice(0, 3).join(' · ');
  return keys.length > 3 ? `${head} …` : head;
};

const CODE_LANG_NAMES: Record<string, string> = {
  javascript: 'JavaScript',
  js: 'JavaScript',
  jsReturn: 'JavaScript',
  java: 'Java',
  groovy: 'Groovy',
};

/** 代码节点函数名摘要：function NAME(…) / const NAME = (…)=>，只取首个声明 */
const codeFunctionName = (script: string | undefined): string | undefined => {
  if (!script) return undefined;
  const fn = script.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
  if (fn) return `${fn[1]}()`;
  const arrow = script.match(
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\(|function)/
  );
  return arrow ? `${arrow[1]}()` : undefined;
};

/**
 * 副标题摘要（2026-11-05 重写）：卡片头部一行只放「决定行为的关键参数」——
 * 模型名、URL、函数名、变量名、循环方式等真实内容；无内容则整行不渲染。
 * 取数字段与 node-schemas 对齐（修复旧实现 5 处读错字段导致永不显示：
 * start 读 inputs / end 读 outputs / llm modelName 未解包 / http url 未解包 /
 * variable 读 assigns / workflow 读 workflowCode）。
 * condition/branches 不设副标题——卡片主体已逐条渲染条件/分支行，计数属零信息冗余。
 */
export const NODE_VISUALS: Record<string, NodeVisual> = {
  [WorkflowNodeType.Start]: {
    category: 'flow',
    Icon: Play,
    subtitle: (n) => {
      // start.outputs.properties 即工作流输入变量（start.schema.json）
      const names = joinNames(propKeys(n.toJSON().data?.outputs?.properties));
      return names ? `${t('nodeSubtitle.inputs')} ${names}` : undefined;
    },
  },
  [WorkflowNodeType.BlockStart]: { category: 'flow', Icon: ArrowDownToDot },
  [WorkflowNodeType.BlockEnd]: { category: 'flow', Icon: ArrowUpFromDot },
  [WorkflowNodeType.End]: {
    category: 'flow',
    Icon: Power,
    subtitle: (n) => {
      const d = n.toJSON().data;
      // end 的 inputs.properties（由 inputsValues 推断）即工作流最终输出变量
      const names =
        joinNames(propKeys(d?.inputs?.properties)) ?? joinNames(propKeys(d?.inputsValues));
      return names ? `${t('nodeSubtitle.outputs')} ${names}` : undefined;
    },
  },
  [WorkflowNodeType.LLM]: {
    category: 'model',
    Icon: Bot,
    subtitle: (n) => {
      const d = n.toJSON().data as any;
      const parts: string[] = [];
      const model = unwrapValue(d?.inputsValues?.modelName ?? d?.modelName);
      if (model) parts.push(model);
      const temperature = unwrapValue(d?.inputsValues?.temperature ?? d?.temperature);
      if (temperature) parts.push(`${t('nodeSubtitle.temperature')} ${temperature}`);
      if (asString(d?.outputMode) === 'json') parts.push(t('nodeSubtitle.outputJson'));
      return parts.length ? parts.join(' · ') : undefined;
    },
  },
  [WorkflowNodeType.HTTP]: {
    category: 'integration',
    Icon: Globe,
    subtitle: (n) => {
      const d = n.toJSON().data as any;
      const method = asString(d?.api?.method);
      // api.url 允许裸字符串或 template/constant 包装（http.schema.json anyOf）
      const raw = unwrapValue(d?.api?.url);
      if (!raw) return undefined;
      try {
        const url = new URL(raw.replace(/\{\{[^}]*\}\}/g, 'x'));
        const hostPath = `${url.host}${url.pathname === '/' ? '' : url.pathname}`;
        return `${method ?? 'GET'} ${hostPath.slice(0, 44)}`;
      } catch {
        return `${method ? `${method} ` : ''}${firstSegment(raw)}`;
      }
    },
  },
  [WorkflowNodeType.Code]: {
    category: 'data',
    Icon: Terminal,
    subtitle: (n) => {
      const d = n.toJSON().data as any;
      const langKey = asString(d?.script?.language ?? d?.language) ?? 'javascript';
      const langName = CODE_LANG_NAMES[langKey] ?? langKey;
      // script 兼容归一化前的裸字符串旧形状
      const script = asString(d?.script?.content) ?? asString(d?.script);
      if (!script) return undefined;
      const fn = codeFunctionName(script);
      return fn ? `${fn} · ${langName}` : langName;
    },
  },
  [WorkflowNodeType.Variable]: {
    category: 'data',
    Icon: Braces,
    subtitle: (n) => {
      // variable.schema.json：assign 列表（旧实现误读 assigns）
      const assigns = n.toJSON().data?.assign;
      if (!Array.isArray(assigns) || !assigns.length) return undefined;
      const names = assigns
        .map((item: unknown) => asString((item as any)?.left) ?? refPath((item as any)?.left))
        .filter(Boolean) as string[];
      const joined = joinNames(names);
      return joined ? `${t('nodeSubtitle.assignTo')} → ${joined}` : undefined;
    },
  },
  [WorkflowNodeType.StringFormat]: {
    category: 'data',
    Icon: TypeIcon,
    subtitle: (n) => firstSegment(n.toJSON().data?.script?.content),
  },
  [WorkflowNodeType.Condition]: {
    category: 'logic',
    Icon: GitBranch,
    // 无副标题：卡片主体逐条渲染 IF/ELSE 条件行，端口即分支结构
  },
  [WorkflowNodeType.Branches]: {
    category: 'logic',
    Icon: GitFork,
    // 无副标题：卡片主体渲染分支容器（标题可改名 + 端口即分支）
  },
  [WorkflowNodeType.Loop]: {
    category: 'logic',
    Icon: RotateCw,
    subtitle: (n) => {
      const d = n.toJSON().data as any;
      const parts: string[] = [];
      // loopFor 引用被循环数组（loop.schema.json：ref 的 content=[节点id, 字段路径]）
      const path = refPath(d?.loopFor);
      if (path) {
        parts.push(`${t('nodeSubtitle.loopOver')} ${path}`);
      } else {
        const times = unwrapValue(d?.loopFor);
        if (times && /^\d+$/.test(times)) parts.push(t('nodeSubtitle.loopTimes', { n: times }));
      }
      const max = d?.maxLoopCount;
      if (typeof max === 'number' && max > 0) parts.push(t('nodeSubtitle.loopMax', { n: max }));
      return parts.length ? parts.join(' · ') : undefined;
    },
  },
  [WorkflowNodeType.Continue]: { category: 'logic', Icon: FastForward },
  [WorkflowNodeType.Break]: { category: 'logic', Icon: Ban },
  [WorkflowNodeType.Workflow]: {
    category: 'integration',
    Icon: WorkflowIcon,
    // workflow.schema.json：workflowName（旧实现误读 workflowCode）
    subtitle: (n) => firstSegment(n.toJSON().data?.workflowName),
  },
  [WorkflowNodeType.Comment]: { category: 'canvas', Icon: MessageSquare },
  group: { category: 'canvas', Icon: GroupBox },
};

const FALLBACK_VISUAL: NodeVisual = { category: 'canvas', Icon: StickyNote };

/** 未知类型走兜底（灰），不抛错——画布渲染不因展示层失败中断 */
export const getNodeVisual = (type: unknown): NodeVisual =>
  NODE_VISUALS[String(type)] ?? FALLBACK_VISUAL;

/** 主题无关消费方（LightCanvas）取分类色 hex */
export const categoryColor = (category: NodeCategory, dark: boolean): string =>
  NODE_CATEGORY_COLORS[category][dark ? 'dark' : 'light'];

/** 主题内消费方取 CSS 变量引用（随 data-theme 切换） */
export const categoryColorVar = (category: NodeCategory): string =>
  `var(--g-nodecat-${category}, ${NODE_CATEGORY_COLORS[category].light})`;
