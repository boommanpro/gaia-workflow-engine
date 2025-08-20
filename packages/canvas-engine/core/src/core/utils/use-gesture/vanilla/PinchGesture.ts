/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { UserPinchConfig, Handler, EventTypes } from '../core/types';
import { registerAction, pinchAction } from '../core/actions';
import { Recognizer } from './Recognizer';

interface PinchGestureConstructor {
  new <EventType = EventTypes['pinch']>(
    target: EventTarget,
    handler: Handler<'pinch', EventType>,
    config?: UserPinchConfig,
  ): PinchGesture;
}

export interface PinchGesture extends Recognizer<'pinch'> {}

export const PinchGesture: PinchGestureConstructor = function <EventType = EventTypes['pinch']>(
  target: EventTarget,
  handler: Handler<'pinch', EventType>,
  config?: UserPinchConfig,
) {
  registerAction(pinchAction);
  return new Recognizer(target, { pinch: handler }, config || {}, 'pinch');
} as any;
