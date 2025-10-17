/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type Layer, type LayerRegistry } from '../layer';

export type PipeSupportEvent = MouseEvent | DragEvent | KeyboardEvent | UIEvent | TouchEvent | any;
export type PipeEventName = string;
export interface PipelineDimension {
  width: number;
  height: number;
}

export type PipelineEventHandler = (event: PipeSupportEvent) => boolean | undefined;

export interface PipelineEventRegsiter {
  handle: PipelineEventHandler;
  priority: number;
}

export enum PipelineLayerPriority {
  BASE_LAYER = -2, // 优先级最低
  TOOL_LAYER = -1, // 工具层
  NORMAL_LAYER, // 使用层
}
export const PipelineLayerFactory = Symbol('PipelineLayerFactory');
export type PipelineLayerFactory = (layerRegistry: LayerRegistry, layerOptions?: any) => Layer;
