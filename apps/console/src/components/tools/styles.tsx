/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */
import styled from 'styled-components';

import { IconMinimap } from '../../assets/icon-minimap';

/**
 * 工具栏容器：位置由偏好控制（默认下部居中，可选 左下 / 顶部 / 左侧竖排）。
 * 颜色走 --ge-* 主题变量（styles/index.css 定义，深色模式自动切换）。
 */
export const ToolContainer = styled.div<{ 'data-position'?: string }>`
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  pointer-events: none;
  gap: 8px;
  z-index: 20;

  &[data-position='left'] {
    left: 16px;
    transform: none;
    justify-content: flex-start;
  }
  &[data-position='top'] {
    bottom: auto;
    top: 10px;
  }
  &[data-position='rail'] {
    left: 16px;
    bottom: auto;
    top: 50%;
    transform: translateY(-50%);
    flex-direction: column;
    align-items: flex-start;
  }
`;

export const ToolSection = styled.div`
  display: flex;
  align-items: center;
  background-color: var(--ge-surface, #fff);
  border: 1px solid var(--ge-border-strong, rgba(68, 83, 130, 0.25));
  border-radius: 10px;
  box-shadow: var(--ge-shadow-sm, rgba(0, 0, 0, 0.04) 0px 2px 6px 0px);
  column-gap: 2px;
  height: 40px;
  padding: 0 4px;
  pointer-events: auto;
`;

/** 小地图独立停靠在左下角，不随工具栏位置设置移动 */
export const MinimapContainer = styled.div`
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 198px;
  z-index: 19;
`;

export const UIIconMinimap = styled(IconMinimap)<{ visible: boolean }>`
  color: ${(props) => (props.visible ? undefined : '#060709cc')};
`;
