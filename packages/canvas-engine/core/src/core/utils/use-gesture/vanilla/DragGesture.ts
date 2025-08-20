/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { EventTypes, Handler, UserDragConfig } from '../core/types';
import { registerAction, dragAction } from '../core/actions';
import { Recognizer } from './Recognizer';

interface DragGestureConstructor {
  new <EventType = EventTypes['drag']>(
    target: EventTarget,
    handler: Handler<'drag', EventType>,
    config?: UserDragConfig,
  ): DragGesture;
}

export interface DragGesture extends Recognizer<'drag'> {}

export const DragGesture: DragGestureConstructor = function <EventType = EventTypes['drag']>(
  target: EventTarget,
  handler: Handler<'drag', EventType>,
  config?: UserDragConfig,
) {
  registerAction(dragAction);
  return new Recognizer(target, { drag: handler }, config || {}, 'drag');
} as any;
