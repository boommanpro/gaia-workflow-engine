/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export enum GroupRenderer {
  GroupRender = 'group_render',
  GroupBox = 'group_box',
}

export const PositionConfig = {
  paddingWithNote: 50, // note 留白大小
  padding: 10, // 无 label 的 padding
  paddingWithAddLabel: 20, // 有 label 的padding，如要放添加按钮
  headerHeight: 20, // 基础头部高度
};

export enum GroupPluginRegister {
  GroupNode = 'registerGroupNode',
  Render = 'registerRender',
  Layer = 'registerLayer',
  CleanGroups = 'registerCleanGroups',
}
