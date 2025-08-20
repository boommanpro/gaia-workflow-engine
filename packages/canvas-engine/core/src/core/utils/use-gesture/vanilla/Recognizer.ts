/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { GestureKey, InternalHandlers, NativeHandlers, UserGestureConfig } from '../core/types';
import { Controller } from '../core';

export class Recognizer<GK extends GestureKey | undefined = undefined> {
  private _gestureKey?: GK;

  private _ctrl: Controller;

  private _target: EventTarget;

  constructor(
    target: EventTarget,
    handlers: InternalHandlers,
    config: GK extends keyof UserGestureConfig ? UserGestureConfig[GK] : UserGestureConfig,
    gestureKey?: GK,
    nativeHandlers?: NativeHandlers,
  ) {
    this._target = target;
    this._gestureKey = gestureKey;
    this._ctrl = new Controller(handlers);
    this._ctrl.applyHandlers(handlers, nativeHandlers);
    this._ctrl.applyConfig({ ...config, target }, gestureKey);

    this._ctrl.effect();
  }

  destroy() {
    this._ctrl.clean();
  }

  setConfig(
    config: GK extends keyof UserGestureConfig ? UserGestureConfig[GK] : UserGestureConfig,
  ) {
    this._ctrl.clean();
    this._ctrl.applyConfig({ ...config, target: this._target }, this._gestureKey);
    this._ctrl.effect();
  }
}
