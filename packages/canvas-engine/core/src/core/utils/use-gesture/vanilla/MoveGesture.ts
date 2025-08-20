/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { UserMoveConfig, Handler, EventTypes } from '../core/types';
import { registerAction, moveAction } from '../core/actions';
import { Recognizer } from './Recognizer';

interface MoveGestureConstructor {
  new <EventType = EventTypes['move']>(
    target: EventTarget,
    handler: Handler<'move', EventType>,
    config?: UserMoveConfig,
  ): MoveGesture;
}

export interface MoveGesture extends Recognizer<'move'> {}

export const MoveGesture: MoveGestureConstructor = function <EventType = EventTypes['move']>(
  target: EventTarget,
  handler: Handler<'move', EventType>,
  config?: UserMoveConfig,
) {
  registerAction(moveAction);
  return new Recognizer(target, { move: handler }, config || {}, 'move');
} as any;
