/**
 * AppShell —— 全站统一外壳（Codex 式三区）。
 *
 * 布局：【左栏 Rail】｜【中区（TopBar + 内容）】｜【右栏 Inspector】
 *
 * 左栏内容随 SectionSwitcher 选择的模式变化（Chat 会话 / Work 文件夹 / Manage 导航），
 * 三块中区与右栏由页面通过 props 注入内容。
 *
 * 折叠能力（Codex 一致）：
 *   · ⌘/Ctrl + B      左栏整体隐藏 / 唤回（PanelLeft 图标）
 *   · ⌘/Ctrl + .      右栏展开 / 收起（PanelRight 图标）
 *   · ⌘/Ctrl + K      全局搜索
 *   · 拖拽左右分隔线  调整左栏 / 右栏宽度；拖到很窄即折叠；双击分隔线恢复默认宽度
 * 折叠状态与面板宽度持久化到 localStorage。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Tooltip } from '@douyinfe/semi-ui';
import { IconSearch } from '@douyinfe/semi-icons';

import { CHAT } from '../../chat/theme';
import { publicPath } from '../../utils/public-path';
import { useLanguage, t } from '../../i18n';
import { GlobalSearch } from './GlobalSearch';
import { UserMenu } from './UserMenu';
import { SectionSwitcher, type SectionMode } from './SectionSwitcher';
import { IconPanelLeft, IconPanelRight } from './icons';

const RAIL_DEFAULT_WIDTH = 252;
const RAIL_MIN_WIDTH = 180;
const RAIL_MAX_WIDTH = 440;
/** 拖拽到该宽度以下即折叠 */
const RAIL_COLLAPSE_WIDTH = 150;

const INSPECTOR_DEFAULT_WIDTH = 420;
const INSPECTOR_MIN_WIDTH = 300;
const INSPECTOR_MAX_WIDTH = 720;
/** 拖拽到该宽度以下即折叠 */
const INSPECTOR_COLLAPSE_WIDTH = 260;

/** 拖拽热区宽度（跨在分界线两侧） */
const HANDLE_SIZE = 7;

const TOPBAR_HEIGHT = 52;
const RAIL_STORAGE_KEY = 'gaia.appshell.railHidden';
const INSPECTOR_STORAGE_KEY = 'gaia.appshell.inspectorCollapsed';
const RAIL_WIDTH_KEY = 'gaia.appshell.railWidth';
const INSPECTOR_WIDTH_KEY = 'gaia.appshell.inspectorWidth';

const readStoredNumber = (key: string, fallback: number): number => {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
};

const writeStoredNumber = (key: string, value: number): void => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
};

export interface AppShellProps {
  /** 当前所在的模式（决定左栏切换器高亮与整体语境） */
  mode: SectionMode;
  /** 品牌右侧小徽标（如「通用模式」） */
  brandBadge?: string;
  /** 左栏顶部主操作（如「新建对话」） */
  railTop?: React.ReactNode;
  /** 左栏主体（会话列表 / 文件夹树 / 管理导航） */
  railMiddle?: React.ReactNode;
  /** 左栏底部附加入口；语言切换会自动追加在其下 */
  railFooter?: React.ReactNode;
  /** 顶栏左侧标题区 */
  title?: React.ReactNode;
  /** 顶栏右侧动作区 */
  actions?: React.ReactNode;
  /** 中区内容 */
  children: React.ReactNode;
  /** 中区额外样式（如管理后台的灰底 + 内边距） */
  bodyStyle?: React.CSSProperties;
  /** 右栏 Inspector 内容；为空则不渲染右栏 */
  inspector?: React.ReactNode;
  /**
   * 右栏是否可用。收起到 null 时 inspector 会变成 undefined，
   * 但展开按钮仍需保留，所以用这个显式标记（不传则回退为 Boolean(inspector)）。
   */
  inspectorAvailable?: boolean;
  /** 右栏是否展开（由页面控制内容后告知外壳） */
  inspectorOpen?: boolean;
  /** 右栏宽度，默认 420 */
  inspectorWidth?: number;
  /** 受控的右栏开关（PanelRight 按钮 / ⌘. 时调用）；不传则用内部折叠状态 */
  onToggleInspector?: () => void;
}

const RailBrand: React.FC<{ badge?: string }> = ({ badge }) => (
  <>
    <img
      src={publicPath('logo.svg')}
      alt="Gaia"
      style={{ width: 48, height: 48, flexShrink: 0, display: 'block' }}
    />
    <span style={{ fontSize: 14.5, fontWeight: 700, color: CHAT.text, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
      Gaia
    </span>
    {badge && (
      <span
        style={{
          marginLeft: 'auto',
          fontSize: 10,
          fontWeight: 600,
          color: CHAT.textMuted,
          background: CHAT.bgRaised,
          border: `1px solid ${CHAT.line}`,
          borderRadius: 5,
          padding: '2px 6px',
          flexShrink: 0,
        }}
      >
        {badge}
      </span>
    )}
  </>
);

/** 顶栏 / 左栏通用的小图标按钮 */
const IconButton: React.FC<{
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, onClick, children }) => (
  <Tooltip content={label} position="bottom">
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        width: 28,
        height: 28,
        flexShrink: 0,
        border: 'none',
        borderRadius: 7,
        background: 'transparent',
        color: CHAT.textMuted,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = CHAT.hover;
        e.currentTarget.style.color = CHAT.textSub;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = CHAT.textMuted;
      }}
    >
      {children}
    </button>
  </Tooltip>
);

/**
 * 面板伸缩把手：拖拽调整宽度，双击恢复默认。
 * 热区跨在分界线两侧（通过 left/right 定位由调用方给出），不占据布局空间。
 */
const ResizeHandle: React.FC<{
  /** 定位：left 或 right 的具体像素值 */
  position: React.CSSProperties;
  onPointerDown: (e: React.PointerEvent) => void;
  onReset: () => void;
  label: string;
}> = ({ position, onPointerDown, onReset, label }) => {
  const [hover, setHover] = useState(false);
  const lastDownRef = useRef(0);
  // 在 pointerdown 里自行判断双击：比 dblclick 可靠（不受 preventDefault / 事件合成影响）
  const handlePointerDown = (e: React.PointerEvent) => {
    const now = Date.now();
    if (now - lastDownRef.current < 300) {
      lastDownRef.current = 0;
      onReset();
      return;
    }
    lastDownRef.current = now;
    onPointerDown(e);
  };
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title={label}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: HANDLE_SIZE,
        cursor: 'col-resize',
        zIndex: 30,
        touchAction: 'none',
        userSelect: 'none',
        background: hover ? CHAT.accentBorder : 'transparent',
        transition: 'background .12s',
        ...position,
      }}
    />
  );
};

export const AppShell: React.FC<AppShellProps> = ({
  mode,
  brandBadge,
  railTop,
  railMiddle,
  railFooter,
  title,
  actions,
  children,
  bodyStyle,
  inspector,
  inspectorAvailable,
  inspectorOpen = false,
  inspectorWidth = 420,
  onToggleInspector,
}) => {
  useLanguage();

  const [railHidden, setRailHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(RAIL_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [inspectorCollapsed, setInspectorCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(INSPECTOR_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [railWidth, setRailWidth] = useState<number>(() =>
    Math.min(RAIL_MAX_WIDTH, Math.max(RAIL_MIN_WIDTH, readStoredNumber(RAIL_WIDTH_KEY, RAIL_DEFAULT_WIDTH))),
  );
  const [inspectorWidthPx, setInspectorWidthPx] = useState<number>(() =>
    Math.min(
      INSPECTOR_MAX_WIDTH,
      Math.max(INSPECTOR_MIN_WIDTH, readStoredNumber(INSPECTOR_WIDTH_KEY, inspectorWidth)),
    ),
  );
  /** 正在拖拽哪一侧；拖拽时关闭宽度过渡，保证跟手 */
  const [dragging, setDragging] = useState<'rail' | 'inspector' | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(RAIL_STORAGE_KEY, railHidden ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [railHidden]);

  useEffect(() => {
    writeStoredNumber(RAIL_WIDTH_KEY, railWidth);
  }, [railWidth]);

  useEffect(() => {
    writeStoredNumber(INSPECTOR_WIDTH_KEY, inspectorWidthPx);
  }, [inspectorWidthPx]);

  useEffect(() => {
    try {
      localStorage.setItem(INSPECTOR_STORAGE_KEY, inspectorCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [inspectorCollapsed]);

  // 页面主动要求展开右栏时，清掉用户的临时收起
  useEffect(() => {
    if (inspectorOpen) setInspectorCollapsed(false);
  }, [inspectorOpen]);

  const toggleRail = useCallback(() => setRailHidden((v) => !v), []);
  const controlledInspector = typeof onToggleInspector === 'function';
  const toggleInspector = useCallback(() => {
    if (controlledInspector) onToggleInspector?.();
    else setInspectorCollapsed((v) => !v);
  }, [controlledInspector, onToggleInspector]);

  // 快捷键：⌘B 左栏 / ⌘. 右栏 / ⌘K 搜索
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setRailHidden((v) => !v);
      } else if (e.key === '.') {
        e.preventDefault();
        if (controlledInspector) onToggleInspector?.();
        else setInspectorCollapsed((v) => !v);
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controlledInspector, onToggleInspector]);

  const hasInspector = inspectorAvailable ?? Boolean(inspector);
  const showInspector = hasInspector && inspectorOpen && (controlledInspector || !inspectorCollapsed);
  const railVisible = !railHidden;

  /** 通用拖拽：onMove 返回 true 表示结束拖拽 */
  const beginDrag = useCallback(
    (e: React.PointerEvent, kind: 'rail' | 'inspector', onMove: (dx: number) => boolean) => {
      if (e.button !== 0) return;
      const startX = e.clientX;
      setDragging(kind);
      // 不用 preventDefault（会连带抑制 dblclick），改用禁选来避免拖拽选中文本
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      let move: (ev: PointerEvent) => void = () => {};
      const cleanup = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', cleanup);
        window.removeEventListener('pointercancel', cleanup);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setDragging(null);
      };
      move = (ev: PointerEvent) => {
        if (onMove(ev.clientX - startX)) cleanup();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', cleanup);
      window.addEventListener('pointercancel', cleanup);
    },
    [],
  );

  /** 拖左栏分隔线：向右变宽，拖过阈值折叠并复位为默认宽度 */
  const onRailDragStart = (e: React.PointerEvent) => {
    const startW = railWidth;
    beginDrag(e, 'rail', (dx) => {
      const raw = startW + dx;
      if (raw <= RAIL_COLLAPSE_WIDTH) {
        setRailWidth(RAIL_DEFAULT_WIDTH);
        setRailHidden(true);
        return true;
      }
      setRailWidth(Math.min(RAIL_MAX_WIDTH, Math.max(RAIL_MIN_WIDTH, raw)));
      return false;
    });
  };

  /** 拖右栏分隔线：向左变宽，拖过阈值折叠并复位为默认宽度 */
  const onInspectorDragStart = (e: React.PointerEvent) => {
    const startW = inspectorWidthPx;
    beginDrag(e, 'inspector', (dx) => {
      const raw = startW - dx;
      if (raw <= INSPECTOR_COLLAPSE_WIDTH) {
        setInspectorWidthPx(INSPECTOR_DEFAULT_WIDTH);
        if (controlledInspector) onToggleInspector?.();
        else setInspectorCollapsed(true);
        return true;
      }
      setInspectorWidthPx(Math.min(INSPECTOR_MAX_WIDTH, Math.max(INSPECTOR_MIN_WIDTH, raw)));
      return false;
    });
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        background: CHAT.bgApp,
      }}
    >
      {/* ---------- 左栏 ---------- */}
      <aside
        style={{
          width: railVisible ? railWidth : 0,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: railVisible ? `1px solid ${CHAT.line}` : 'none',
          background: CHAT.bgSunken,
          height: '100%',
          transition: dragging === 'rail' ? 'none' : 'width .2s ease',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: TOPBAR_HEIGHT, display: 'flex', alignItems: 'center', gap: 9, padding: '0 8px 0 12px', flexShrink: 0 }}>
          <div
            onClick={() => {
              window.location.href = '/';
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, flex: 1, cursor: 'pointer' }}
            title={t('admin.returnHome')}
          >
            <RailBrand badge={brandBadge} />
          </div>
          <IconButton label={t('shell.collapseRail')} onClick={toggleRail}>
            <IconPanelLeft />
          </IconButton>
          <IconButton label={t('shell.search')} onClick={() => setSearchOpen(true)}>
            <IconSearch size="default" />
          </IconButton>
        </div>

        <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
          <SectionSwitcher mode={mode} />
        </div>

        {railTop && <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>{railTop}</div>}

        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {railMiddle}
        </div>

        <div style={{ borderTop: `1px solid ${CHAT.line}`, padding: 8, flexShrink: 0 }}>
          {railFooter}
          <UserMenu />
        </div>
      </aside>

      {/* ---------- 中区（TopBar + 内容） ---------- */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: CHAT.bg }}>
        <header
          style={{
            height: TOPBAR_HEIGHT,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 12px 0 14px',
            borderBottom: `1px solid ${CHAT.lineSoft}`,
          }}
        >
          {!railVisible && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <IconButton label={t('shell.expandRail')} onClick={toggleRail}>
                <IconPanelLeft />
              </IconButton>
              <IconButton label={t('shell.search')} onClick={() => setSearchOpen(true)}>
                <IconSearch size="default" />
              </IconButton>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>{title}</div>

          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{actions}</div>}

          {/* 右栏收起时，中区顶栏露出展开按钮（与左栏 PanelLeft 图标镜像）；展开后交给右栏自身右上角的收起按钮 */}
          {hasInspector && !showInspector && (
            <IconButton label={t('shell.expandInspector')} onClick={toggleInspector}>
              <IconPanelRight />
            </IconButton>
          )}
        </header>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', ...bodyStyle }}>{children}</div>
      </div>

      {/* ---------- 右栏 Inspector ---------- */}
      {showInspector && inspector && (
        <div
          style={{
            width: inspectorWidthPx,
            flexShrink: 0,
            display: 'flex',
            borderLeft: `1px solid ${CHAT.line}`,
            background: CHAT.bg,
            transition: dragging === 'inspector' ? 'none' : 'width .2s ease',
          }}
        >
          {inspector}
        </div>
      )}

      {/* ---------- 伸缩把手（跨在分界线两侧，浮在内容之上） ---------- */}
      {railVisible && (
        <ResizeHandle
          label={t('shell.resizeHint')}
          position={{ left: railWidth - HANDLE_SIZE / 2 }}
          onPointerDown={onRailDragStart}
          onReset={() => setRailWidth(RAIL_DEFAULT_WIDTH)}
        />
      )}
      {showInspector && (
        <ResizeHandle
          label={t('shell.resizeHint')}
          position={{ right: inspectorWidthPx - HANDLE_SIZE / 2 }}
          onPointerDown={onInspectorDragStart}
          onReset={() => setInspectorWidthPx(INSPECTOR_DEFAULT_WIDTH)}
        />
      )}

      <GlobalSearch visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export default AppShell;
