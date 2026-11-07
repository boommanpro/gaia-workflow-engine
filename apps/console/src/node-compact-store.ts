/**
 * 节点级紧凑状态（2026-11-07 晚改版）：存入节点 `meta.compact`，随 DSL 持久化到后端——
 * 草稿/发布版本各自携带折叠形态，载入不同版本即呈现该版本的区别（用户决策，
 * 替代当日早间的 localStorage 方案；meta 属视图层元数据，同 position，不进 node-schemas 契约）。
 *
 * 写入链路：free-layout 默认 toNodeJSON 只序列化 position，`meta.compact` 由
 * use-editor-props 的 toNodeJSON 钩子透传；这里同时改 getNodeMeta() 缓存（本会话读）
 * 与实体 metaFromJSON（缓存失效后重建的源）。
 * meta 直改不触发画布 content change，回流需手动调 canvasSync（'NODE_COMPACT_CHANGE'
 * 已在 canvas-sync 放行，纯紧凑变化不会被当序列化噪音丢弃）；
 * 未 attach 的画布（只读预览/模板）canvasSync 内部自忽略，仅当次会话生效。
 */
import { useCallback, useEffect, useState } from 'react';

import { FlowNodeEntity } from '@flowgram.ai/free-layout-editor';

import { FlowNodeMeta } from './typings';
import { canvasSync } from './document';

/** 同节点多 hook 实例（BaseNode + FormHeader）间的状态同步事件 */
const COMPACT_EVENT = 'gaia-node-compact-change';

export const useNodeCompact = (
  node: FlowNodeEntity
): { collapsed: boolean; toggle: () => void } => {
  const [collapsed, setCollapsed] = useState<boolean>(() =>
    Boolean(node.getNodeMeta<FlowNodeMeta>().compact)
  );

  // BaseNode 与 FormHeader 各持一个 hook 实例：任一实例切换后广播，全体按 meta 事实同步
  useEffect(() => {
    const onChange = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== node.id) return;
      setCollapsed(Boolean(node.getNodeMeta<FlowNodeMeta>().compact));
    };
    window.addEventListener(COMPACT_EVENT, onChange);
    return () => window.removeEventListener(COMPACT_EVENT, onChange);
  }, [node]);

  const toggle = useCallback(() => {
    const meta = node.getNodeMeta<FlowNodeMeta>();
    const next = !meta.compact;
    if (next) {
      meta.compact = true;
    } else {
      delete meta.compact;
    }
    // 同步实体序列化源（_metaCache 失效重建时从 metaFromJSON 合并）
    const raw = node as unknown as { metaFromJSON?: Record<string, unknown> };
    if (raw.metaFromJSON) {
      if (next) {
        raw.metaFromJSON.compact = true;
      } else {
        delete raw.metaFromJSON.compact;
      }
    }
    setCollapsed(next);
    canvasSync.onCanvasChange(['NODE_COMPACT_CHANGE']);
    window.dispatchEvent(new CustomEvent(COMPACT_EVENT, { detail: node.id }));
  }, [node]);

  return { collapsed, toggle };
};
