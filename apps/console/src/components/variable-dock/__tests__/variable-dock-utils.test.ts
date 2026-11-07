/**
 * 变量 Dock 纯逻辑测试（分组 / 搜索过滤 / 统计）—— 2026-11-05 方案 A。
 * 只覆盖 variable-dock-utils 的纯函数；面板渲染与 flowgram 集成未在此覆盖（见交付说明）。
 */
import { describe, expect, it } from 'vitest';

import {
  buildDockGroups,
  countDockRows,
  filterDockGroups,
  type DockVarNode,
} from '../variable-dock-utils';

/** 模拟 useVariableTree 的产出：顶层作用域块（含嵌套 object）+ 叶子顶层变量 */
const tree: DockVarNode[] = [
  {
    key: 'global',
    label: '全局变量',
    children: [
      { key: 'global.threshold', label: 'threshold' },
      {
        key: 'global.env_config',
        label: 'env_config',
        children: [{ key: 'global.env_config.api_key', label: 'api_key' }],
      },
    ],
  },
  {
    key: 'start',
    label: '开始',
    children: [
      { key: 'start.query', label: '用户输入' },
      { key: 'start.context', label: '上下文' },
    ],
  },
  { key: 'solo_var', label: '独立变量' },
];

describe('buildDockGroups', () => {
  it('顶层变量成为分组，子字段摊平为带路径的行', () => {
    const groups = buildDockGroups(tree);
    expect(groups.map((g) => g.key)).toEqual(['global', 'start', 'solo_var']);
    expect(groups[1].rows.map((r) => r.key)).toEqual(['start.query', 'start.context']);
    expect(groups[1].rows[0].depth).toBe(1);
  });

  it('嵌套 object 的子字段继续摊平并加深缩进层级', () => {
    const groups = buildDockGroups(tree);
    const globalRows = groups[0].rows.map((r) => `${r.key}@${r.depth}`);
    expect(globalRows).toEqual([
      'global.threshold@1',
      'global.env_config@1',
      'global.env_config.api_key@2',
    ]);
  });

  it('无子字段的顶层变量自身作为该分组唯一一行', () => {
    const groups = buildDockGroups(tree);
    expect(groups[2].rows).toEqual([
      { key: 'solo_var', label: '独立变量', icon: undefined, disabled: undefined, depth: 0 },
    ]);
  });
});

describe('filterDockGroups', () => {
  it('按行名称匹配（大小写不敏感）', () => {
    const groups = filterDockGroups(buildDockGroups(tree), 'THRESH');
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('global');
    expect(groups[0].rows.map((r) => r.key)).toEqual(['global.threshold']);
  });

  it('按行路径匹配（点号路径）', () => {
    const groups = filterDockGroups(buildDockGroups(tree), 'start.query');
    expect(groups).toHaveLength(1);
    expect(groups[0].rows.map((r) => r.key)).toEqual(['start.query']);
  });

  it('分组名命中时保留该组全部字段', () => {
    const groups = filterDockGroups(buildDockGroups(tree), '开始');
    expect(groups).toHaveLength(1);
    expect(groups[0].rows).toHaveLength(2);
  });

  it('空查询原样返回；无命中返回空数组', () => {
    const all = buildDockGroups(tree);
    expect(filterDockGroups(all, '   ')).toEqual(all);
    expect(filterDockGroups(all, '不存在的变量')).toEqual([]);
  });
});

describe('countDockRows', () => {
  it('统计全部行数（含嵌套层）', () => {
    expect(countDockRows(buildDockGroups(tree))).toBe(6);
  });
});
