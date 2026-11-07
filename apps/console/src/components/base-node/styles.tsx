/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */
import styled from 'styled-components';
import { IconInfoCircle } from '@douyinfe/semi-icons';

/** 节点卡外壳；紧凑形态见下方 &.compact（2026-11-06 重设计，组件驱动，无全局 CSS 钩子） */
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
   * 紧凑密度胶囊（docs/node-compact-mode-redesign-2026-11-06.md §3.2）：
   * 高度由子组件 CompactNodeCard 按端口数决定（36/48/64/96）
   */
  &.compact {
    flex-direction: row;
    align-items: center;
    width: 260px;
    height: auto;
    min-height: 36px;
    border-radius: 10px;
    padding: 0 11px;
    cursor: pointer;
  }

  &.compact.selected {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--g-editor-accent, #4e40e5) 18%, transparent),
      var(--ge-shadow-sm, 0 2px 6px 0 rgba(0, 0, 0, 0.04));
  }
`;

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
