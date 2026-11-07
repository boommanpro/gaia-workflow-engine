/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */
import styled from 'styled-components';
import { IconInfoCircle } from '@douyinfe/semi-icons';

/**
 * 节点卡外壳；紧凑形态见下方 &.compact（2026-11-07 n8n 方卡，组件驱动，无全局 CSS 钩子）。
 * 状态呈色一律走 box-shadow 光环（不改变 border 宽度），避免引擎测得的节点边界抖动。
 */
export const NodeWrapperStyle = styled.div`
  align-items: flex-start;
  background-color: var(--ge-surface, #fff);
  border: 1px solid var(--ge-border-strong, rgba(6, 7, 9, 0.15));
  border-radius: 8px;
  box-shadow: var(--ge-shadow-sm, 0 2px 6px 0 rgba(0, 0, 0, 0.04));
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  width: 300px;
  height: auto;
  color: var(--ge-text, #22242e);

  &.selected {
    border: 1px solid var(--g-editor-accent, #4e40e5);
  }

  /**
   * 紧凑方卡（n8n 风格，docs/node-compact-per-node-2026-11-07.md）：
   * 92×92 固定（高度由 CompactNodeCard 按动态端口数扩展），标签外置下方；
   * 高度不写死——子组件 CompactNodeCard 显式给定。
   */
  &.compact {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 92px;
    height: auto;
    border-radius: 12px;
    cursor: pointer;
  }

  &.compact.selected {
    box-shadow: 0 0 0 2px var(--g-editor-accent, #4e40e5),
      0 0 0 5px color-mix(in srgb, var(--g-editor-accent, #4e40e5) 18%, transparent),
      var(--ge-shadow-sm, 0 2px 6px 0 rgba(0, 0, 0, 0.04));
  }

  /* 试运行状态：边框光环换色（口径复用 statusDotColor，不占卡内空间） */
  &.compact.st-processing {
    box-shadow: 0 0 0 2px var(--g-nodecat-flow, #2f7df6),
      var(--ge-shadow-sm, 0 2px 6px 0 rgba(0, 0, 0, 0.04));
  }

  &.compact.st-succeeded {
    box-shadow: 0 0 0 2px var(--g-nodecat-data, #0e9384),
      var(--ge-shadow-sm, 0 2px 6px 0 rgba(0, 0, 0, 0.04));
  }

  &.compact.st-failed {
    box-shadow: 0 0 0 2px #e5404e, var(--ge-shadow-sm, 0 2px 6px 0 rgba(0, 0, 0, 0.04));
  }
`;

/**
 * 收起按钮样式已移除（2026-11-07）：框按钮固定在卡片头 FormHeader 内（Semi Button），
 * 不再用卡外悬浮定位。
 */

export const ErrorIcon = () => (
  <IconInfoCircle
    style={{
      position: 'absolute',
      color: 'red',
      left: -6,
      top: -6,
      zIndex: 1,
      background: 'var(--ge-surface, white)',
      borderRadius: 8,
    }}
  />
);
