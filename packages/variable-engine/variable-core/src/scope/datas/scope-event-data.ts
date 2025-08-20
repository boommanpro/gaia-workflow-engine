/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Subject, filter } from 'rxjs';
import { Disposable } from '@flowgram.ai/utils';

import { type Scope } from '../scope';
import { subsToDisposable } from '../../utils/toDisposable';
import { type GlobalEventActionType } from '../../ast';

type Observer<ActionType extends GlobalEventActionType = GlobalEventActionType> = (
  action: ActionType
) => void;

export class ScopeEventData {
  event$: Subject<GlobalEventActionType> = new Subject<GlobalEventActionType>();

  dispatch<ActionType extends GlobalEventActionType = GlobalEventActionType>(action: ActionType) {
    if (this.scope.disposed) {
      return;
    }
    this.event$.next(action);
  }

  subscribe<ActionType extends GlobalEventActionType = GlobalEventActionType>(
    observer: Observer<ActionType>
  ): Disposable {
    return subsToDisposable(this.event$.subscribe(observer as Observer));
  }

  on<ActionType extends GlobalEventActionType = GlobalEventActionType>(
    type: ActionType['type'],
    observer: Observer<ActionType>
  ): Disposable {
    return subsToDisposable(
      this.event$.pipe(filter((_action) => _action.type === type)).subscribe(observer as Observer)
    );
  }

  constructor(public readonly scope: Scope) {
    scope.toDispose.pushAll([
      this.subscribe((_action) => {
        scope.variableEngine.fireGlobalEvent(_action);
      }),
    ]);
  }
}
