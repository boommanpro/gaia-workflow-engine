/**
 * 变量 Dock —— 纯数据组织逻辑（分组 / 搜索过滤 / 统计）。
 * 与 flowgram hooks 解耦，便于单元测试（2026-11-05 方案 A）。
 */
import type { ReactNode } from 'react';

/** useVariableTree 产出的节点形状（key 为点号引用路径，如 start.query） */
export interface DockVarNode {
  key: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  children?: DockVarNode[];
}

/** Dock 中的一行变量（叶子或可引用的中间路径，depth 用于缩进） */
export interface DockVarRow {
  key: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  depth: number;
}

/** 变量分组：顶层变量（作用域块，如 global / start / 各节点输出） */
export interface DockVarGroup {
  key: string;
  label: string;
  icon?: ReactNode;
  rows: DockVarRow[];
}

function toRow(node: DockVarNode, depth: number): DockVarRow {
  return {
    key: node.key,
    label: node.label,
    icon: node.icon,
    disabled: node.disabled,
    depth,
  };
}

function flattenRows(nodes: DockVarNode[], depth: number): DockVarRow[] {
  return nodes.flatMap((node) => [
    toRow(node, depth),
    ...(node.children?.length ? flattenRows(node.children, depth + 1) : []),
  ]);
}

/**
 * 把 useVariableTree 的作用域树摊平为「分组（顶层变量）→ 行（带路径字段）」。
 * 顶层变量本身就是叶子（无 children）时，它自己作为该分组唯一一行。
 */
export function buildDockGroups(nodes: DockVarNode[]): DockVarGroup[] {
  return nodes.map((node) => ({
    key: node.key,
    label: node.label,
    icon: node.icon,
    rows: node.children?.length ? flattenRows(node.children, 1) : [toRow(node, 0)],
  }));
}

/**
 * 搜索过滤：按行名称 / 行路径 / 分组名称匹配（分组名命中时保留该组全部字段）。
 * 大小写不敏感；空查询原样返回。
 */
export function filterDockGroups(groups: DockVarGroup[], query: string): DockVarGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  const hit = (s?: string) => !!s && s.toLowerCase().includes(q);
  return groups
    .map((g) => {
      if (hit(g.label) || hit(g.key)) return g;
      const rows = g.rows.filter((r) => hit(r.label) || hit(r.key));
      return rows.length ? { ...g, rows } : null;
    })
    .filter((g): g is DockVarGroup => g !== null);
}

/** 变量总行数（页脚统计用） */
export function countDockRows(groups: DockVarGroup[]): number {
  return groups.reduce((n, g) => n + g.rows.length, 0);
}
