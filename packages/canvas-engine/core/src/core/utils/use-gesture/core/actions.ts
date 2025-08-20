/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { GestureKey, EngineClass, Action } from './types';
import { WheelEngine } from './engines/WheelEngine';
import { ScrollEngine } from './engines/ScrollEngine';
import { PinchEngine } from './engines/PinchEngine';
import { MoveEngine } from './engines/MoveEngine';
import { HoverEngine } from './engines/HoverEngine';
import { DragEngine } from './engines/DragEngine';
import { wheelConfigResolver } from './config/wheelConfigResolver';
import { scrollConfigResolver } from './config/scrollConfigResolver';
import { ResolverMap } from './config/resolver';
import { pinchConfigResolver } from './config/pinchConfigResolver';
import { moveConfigResolver } from './config/moveConfigResolver';
import { hoverConfigResolver } from './config/hoverConfigResolver';
import { dragConfigResolver } from './config/dragConfigResolver';

export const EngineMap = new Map<GestureKey, EngineClass<any>>();
export const ConfigResolverMap = new Map<GestureKey, ResolverMap>();

export function registerAction(action: Action) {
  EngineMap.set(action.key, action.engine);
  ConfigResolverMap.set(action.key, action.resolver);
}

export const dragAction: Action = {
  key: 'drag',
  engine: DragEngine as any,
  resolver: dragConfigResolver,
};

export const hoverAction: Action = {
  key: 'hover',
  engine: HoverEngine as any,
  resolver: hoverConfigResolver,
};

export const moveAction: Action = {
  key: 'move',
  engine: MoveEngine as any,
  resolver: moveConfigResolver,
};

export const pinchAction: Action = {
  key: 'pinch',
  engine: PinchEngine as any,
  resolver: pinchConfigResolver,
};

export const scrollAction: Action = {
  key: 'scroll',
  engine: ScrollEngine as any,
  resolver: scrollConfigResolver,
};

export const wheelAction: Action = {
  key: 'wheel',
  engine: WheelEngine as any,
  resolver: wheelConfigResolver,
};
