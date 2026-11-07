/**
 * 变量 Dock（底部）—— 2026-11-05 方案 A 实施基线。
 *
 * 背景：旧的「切换变量面板」是画布 world 层里的浮动层（variable-panel-layer.tsx），
 * 定位补偿未除以缩放系数（zoom≠100% 时按钮漂移/面板被裁切，即「点击不生效」根因），
 * 且面板 DOM 无事件隔离（点击触发画布反选、滚轮被画布抢走变缩放）、与右上节点表单抢位。
 *
 * 现由 panel-manager-plugin 的 bottom 区承载：渲染在 shell 层（world 变换之外），
 * 与 right 区（节点表单）VS Code 式共存，高度可拖拽（面板系统 ResizeBar）。
 * 列表能力：搜索（名称/路径）、按来源分组（顶层变量）、类型图标、点击行复制引用路径。
 * 工具栏入口与 ⌘J 快捷键见 use-variable-dock.ts。
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { type PanelFactory } from '@flowgram.ai/panel-manager-plugin';
import {
  ArrayType,
  CustomType,
  GlobalScope,
  isMatchAST,
  ObjectType,
  useRefresh,
  useService,
  VariableEngine,
} from '@flowgram.ai/free-layout-editor';
import { IconButton, Input, Tabs, Toast, Tooltip } from '@douyinfe/semi-ui';
import { IconCopy, IconSearch } from '@douyinfe/semi-icons';

import { ArrayIcons, VariableTypeIcons } from '../../plugins/sync-variable-plugin/icons';
import { useLanguage, t } from '../../i18n';
import {
  buildDockGroups,
  countDockRows,
  filterDockGroups,
  type DockVarNode,
} from './variable-dock-utils';
import { GlobalVariableEditor } from './global-variable-editor';

import styles from './variable-dock.module.less';

export const VARIABLE_DOCK_PANEL_KEY = 'variable-dock-panel';

export const variableDockPanelFactory: PanelFactory<void> = {
  key: VARIABLE_DOCK_PANEL_KEY,
  /** bottom 区面板的 size 语义是像素高度 */
  defaultSize: 288,
  minSize: 180,
  maxSize: 560,
  /** 关闭时保留 DOM：搜索词 / 页签状态在开关之间不丢 */
  keepDOM: true,
  render: () => <VariableDockPanel />,
};

/** 变量声明（作用域块或其子字段），与 sync-variable-plugin 的取值口径保持一致 */
type VariableField = any;

/** 类型图标（与 sync-variable-plugin/use-variable-tree 同规则） */
function getVariableTypeIcon(variable: VariableField) {
  const _type = variable.type;
  if (isMatchAST(_type, ArrayType)) {
    return (
      (ArrayIcons as any)[_type.items?.kind.toLowerCase()] || (VariableTypeIcons as any)['array']
    );
  }
  if (isMatchAST(_type, CustomType)) {
    return (VariableTypeIcons as any)[_type.typeName.toLowerCase()];
  }
  return (VariableTypeIcons as any)[variable.type?.kind.toLowerCase()];
}

/** 变量图标：优先声明自带的 meta.icon（块变量携带节点图标），否则按类型取 */
function getVariableIcon(variable: VariableField) {
  const metaIcon = variable?.meta?.icon;
  if (typeof metaIcon === 'string') {
    return <img src={metaIcon} width={14} height={14} alt="" />;
  }
  if (metaIcon) {
    return metaIcon as ReactNode;
  }
  return getVariableTypeIcon(variable);
}

/** 变量声明 → Dock 节点（key 为点号引用路径，与 fx ref content 同构；路径段与表单侧选择器同规则） */
function variableToNode(variable: VariableField, parentPath = ''): DockVarNode | null {
  if (!variable?.type) return null;
  const seg = variable.meta?.titleKey || variable.key;
  const key = parentPath ? `${parentPath}.${seg}` : seg;
  let children: DockVarNode[] | undefined;
  if (isMatchAST(variable.type, ObjectType)) {
    children = (variable.type.properties || [])
      .map((_p: VariableField) => variableToNode(_p, key))
      .filter(Boolean) as DockVarNode[];
  }
  return {
    key,
    label: variable.meta?.expressionTitle || variable.meta?.title || variable.key || '',
    icon: getVariableIcon(variable),
    children,
  };
}

/**
 * 变量清单数据源 —— 直接聚合 VariableEngine，不经 useScopeAvailable：
 * 后者要求 ScopeProvider（节点表单内才有），面板层 portal 里没有该上下文
 * （2026-11-05 浏览器实测：useCurrentScope strict 抛错导致整层面板崩卸）。
 * 口径：全局块 + 各节点公共作用域的输出块；私有作用域（循环节点 *_locals）不进总览，
 * 仍在各输入框的类型过滤选择器里按可达性出现。
 */
function useDockVariableTree(): DockVarNode[] {
  const engine = useService(VariableEngine);
  const globalScope = useService(GlobalScope);
  const refresh = useRefresh();

  useEffect(() => {
    const disposables = [
      engine.onScopeChange(() => refresh()),
      globalScope.output.onVariableListChange(() => refresh()),
    ];
    return () => disposables.forEach((d) => d.dispose());
  }, [engine, globalScope]);

  // 变量规模小且 refresh() 驱动整组件重渲染，直接重算不做 memo
  const nodes: DockVarNode[] = [];
  const globalVar = globalScope.getVar() as VariableField;
  if (globalVar && !globalVar.meta?.readonly) {
    const node = variableToNode(globalVar);
    if (node) nodes.push(node);
  }
  engine.getAllScopes().forEach((scope) => {
    if (scope.disposed || GlobalScope.is(scope)) return;
    const scopeMeta = scope.meta as { type?: string };
    if (scopeMeta?.type !== 'public') return;
    (scope.output?.variables || [])
      .filter((_v: VariableField) => !_v.meta?.readonly)
      .forEach((_v: VariableField) => {
        const node = variableToNode(_v);
        if (node) nodes.push(node);
      });
  });
  return nodes;
}

/** 复制到剪贴板；clipboard API 不可用（非安全上下文）时回退 execCommand */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 落到下方兜底路径 */
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

const VariableDockPanel = () => {
  useLanguage();
  const [tab, setTab] = useState<string>('list');
  const [query, setQuery] = useState('');
  const tree = useDockVariableTree();

  const groups = useMemo(() => buildDockGroups(tree), [tree]);
  const visibleGroups = useMemo(() => filterDockGroups(groups, query), [groups, query]);
  const rowCount = useMemo(() => countDockRows(groups), [groups]);

  const handleCopy = (path: string) => {
    void copyToClipboard(path).then((ok) => {
      if (ok) {
        Toast.success(`${t('variableDock.copied')}: ${path}`);
      } else {
        Toast.error(t('variableDock.copyFailed'));
      }
    });
  };

  return (
    <div className={styles['variable-dock']}>
      <div className={styles['dock-header']}>
        <Tabs activeKey={tab} onChange={(k) => setTab(k as string)} size="small">
          <Tabs.TabPane tab={t('variableDock.listTab')} itemKey="list" />
          <Tabs.TabPane tab={t('variableDock.globalTab')} itemKey="global" />
        </Tabs>
        {tab === 'list' && (
          <Input
            className={styles['search']}
            size="small"
            showClear
            value={query}
            onChange={(v) => setQuery(v)}
            prefix={<IconSearch />}
            placeholder={t('variableDock.searchPlaceholder')}
            aria-label={t('variableDock.searchPlaceholder')}
          />
        )}
        <span className={styles['spacer']} />
        {tab === 'list' && (
          <span className={styles['count']}>
            {t('variableDock.count', { n: rowCount, g: groups.length })}
          </span>
        )}
        <span className={styles['kbd']}>⌘J</span>
      </div>

      {tab === 'list' ? (
        <div className={styles['dock-body']} role="list">
          {visibleGroups.length === 0 ? (
            <div className={styles['dock-empty']}>
              {query ? t('variableDock.noResults') : t('variableDock.empty')}
            </div>
          ) : (
            visibleGroups.map((g) => (
              <div key={g.key} className={styles['dock-group']}>
                <div className={styles['group-header']}>
                  <span className={styles['group-icon']}>{g.icon}</span>
                  <span className={styles['group-label']}>{g.label}</span>
                  <span className={styles['group-count']}>{g.rows.length}</span>
                </div>
                {g.rows.map((r) => (
                  <div
                    key={r.key}
                    className={styles['var-row']}
                    style={{ paddingLeft: 12 + r.depth * 18 }}
                    role="listitem"
                    title={`${t('variableDock.copyPath')}: ${r.key}`}
                    onClick={() => handleCopy(r.key)}
                  >
                    <span className={styles['row-icon']}>{r.icon}</span>
                    <span className={styles['row-label']}>{r.label}</span>
                    <span className={styles['row-path']}>{r.key}</span>
                    <Tooltip content={t('variableDock.copyPath')}>
                      <IconButton
                        className={styles['copy-btn']}
                        size="small"
                        type="tertiary"
                        theme="borderless"
                        icon={<IconCopy size="small" />}
                        aria-label={`${t('variableDock.copyPath')}: ${r.key}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(r.key);
                        }}
                      />
                    </Tooltip>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className={styles['global-body']}>
          <GlobalVariableEditor />
        </div>
      )}

      <div className={styles['dock-footer']}>
        <span>{t('variableDock.footerHint')}</span>
      </div>
    </div>
  );
};
