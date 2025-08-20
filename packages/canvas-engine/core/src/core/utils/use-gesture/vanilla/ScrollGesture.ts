/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { UserScrollConfig, Handler, EventTypes } from '../core/types';
import { registerAction, scrollAction } from '../core/actions';
import { Recognizer } from './Recognizer';

interface ScrollGestureConstructor {
  new <EventType = EventTypes['scroll']>(
    target: EventTarget,
    handler: Handler<'scroll', EventType>,
    config?: UserScrollConfig,
  ): ScrollGesture;
}

export interface ScrollGesture extends Recognizer<'scroll'> {}

export const ScrollGesture: ScrollGestureConstructor = function <EventType = EventTypes['scroll']>(
  target: EventTarget,
  handler: Handler<'scroll', EventType>,
  config?: UserScrollConfig,
) {
  registerAction(scrollAction);
  return new Recognizer(target, { scroll: handler }, config || {}, 'scroll');
} as any;
