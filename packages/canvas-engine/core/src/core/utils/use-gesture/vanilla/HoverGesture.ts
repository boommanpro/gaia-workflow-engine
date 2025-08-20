/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { EventTypes, UserHoverConfig, Handler } from '../core/types';
import { registerAction, hoverAction } from '../core/actions';
import { Recognizer } from './Recognizer';

interface HoverGestureConstructor {
  new <EventType = EventTypes['hover']>(
    target: EventTarget,
    handler: Handler<'hover', EventType>,
    config?: UserHoverConfig,
  ): HoverGesture;
}

export interface HoverGesture extends Recognizer<'hover'> {}

export const HoverGesture: HoverGestureConstructor = function <EventType = EventTypes['hover']>(
  target: EventTarget,
  handler: Handler<'hover', EventType>,
  config?: UserHoverConfig,
) {
  registerAction(hoverAction);
  return new Recognizer(target, { hover: handler }, config || {}, 'hover');
} as any;
