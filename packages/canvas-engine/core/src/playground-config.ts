/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

// import {
//   PlaygroundConfigEntity,
//   SelectorBoxConfigEntity,
//   SnaplineConfigEntity,
//   EditorStateConfigEntity,
// } from './core/layer/config';
import {
  // AlignLayer,
  type EditorState,
  type LayerRegistry,
  // SelectorBoxLayer,
  // SelectorLayer,
  // SnaplineLayer,
} from './core/layer';
// import { SelectableEntity } from './core/entity';
// import { Selectable } from './core/able/selectable';
// import { Dragable, Resizable } from './core/able';
import { type ConfigEntity, type EntityRegistry } from './common';

export const PlaygroundConfig = Symbol('PlaygroundConfig');

/**
 * 画布配置
 */
export interface PlaygroundConfig {
  layers?: LayerRegistry[]; // 渲染分层
  // ables?: AbleRegistry[]; // 能力
  // entities?: EntityRegistry[]; // 数据实体
  editorStates?: EditorState[]; // 编辑态切换
  width?: number; // 画布的初始宽度
  height?: number; // 画布的初始高度
  node?: HTMLElement; // 画布的容器节点
  autoFocus?: boolean; // 自动 focus 及 blur，默认 true
  autoResize?: boolean; // 监听变化
  zoomEnable?: boolean; // 是否支持缩放，默认 true
  contextMenuPath?: string[]; // 右键菜单路径
  entityConfigs?: Map<EntityRegistry<ConfigEntity>, any>;
  context?: any; // 注入到 layer 中的上下文数据
}

/**
 * 默认配置
 */
export function createDefaultPlaygroundConfig(): PlaygroundConfig {
  return {
    autoFocus: true,
    autoResize: true,
    zoomEnable: true,
    layers: [
      // PlaygroundLayer, // 基础配置
      // SelectorLayer, // 节点选择器
      // SelectorBoxLayer, // 选择框
      // SnaplineLayer, // 参考线
      // AlignLayer, // 对齐线
    ],
    // ables: [Dragable, Selectable, Resizable],
    // entities: [
    //   SelectableEntity,
    //   SnaplineConfigEntity,
    //   PlaygroundConfigEntity,
    //   SelectorBoxConfigEntity,
    //   EditorStateConfigEntity,
    // ],
  };
}
