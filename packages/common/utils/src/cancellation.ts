/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation and others. All rights reserved.
 *  Licensed under the MIT License. See https://github.com/Microsoft/vscode/blob/master/LICENSE.txt for license information.
 *
 * Fork: https://github.com/Microsoft/vscode/blob/main/src/vs/base/common/cancellation.ts
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from './event';
import { type Disposable } from './disposable';

export interface CancellationToken {
  /**
   * A flag signalling is cancellation has been requested.
   */
  readonly isCancellationRequested: boolean;
  /**
   * An event which fires when cancellation is requested. This event
   * only ever fires `once` as cancellation can only happen once. Listeners
   * that are registered after cancellation will be called (next event loop run),
   * but also only once.
   * @event
   */
  readonly onCancellationRequested: Event<void>;
}

const shortcutEvent: Event<any> = Object.freeze(function (callback, context?): Disposable {
  const handle = setTimeout(callback.bind(context), 0);
  return {
    dispose() {
      clearTimeout(handle);
    },
  };
});

export namespace CancellationToken {
  export function isCancellationToken(thing: unknown): thing is CancellationToken {
    if (thing === CancellationToken.None || thing === CancellationToken.Cancelled) {
      return true;
    }
    if (thing instanceof MutableToken) {
      return true;
    }
    if (!thing || typeof thing !== 'object') {
      return false;
    }
    return (
      typeof (thing as CancellationToken).isCancellationRequested === 'boolean' &&
      typeof (thing as CancellationToken).onCancellationRequested === 'function'
    );
  }
  export const None = Object.freeze<CancellationToken>({
    isCancellationRequested: false,
    onCancellationRequested: Event.None,
  });

  export const Cancelled = Object.freeze<CancellationToken>({
    isCancellationRequested: true,
    onCancellationRequested: shortcutEvent,
  });
}

export class MutableToken implements CancellationToken {
  private _isCancelled = false;

  private _emitter?: Emitter<void>;

  public cancel(): void {
    if (!this._isCancelled) {
      this._isCancelled = true;
      if (this._emitter) {
        this._emitter.fire(undefined);
        this.dispose();
      }
    }
  }

  get isCancellationRequested(): boolean {
    return this._isCancelled;
  }

  get onCancellationRequested(): Event<void> {
    if (this._isCancelled) {
      return shortcutEvent;
    }
    if (!this._emitter) {
      this._emitter = new Emitter<void>();
    }
    return this._emitter.event;
  }

  public dispose(): void {
    if (this._emitter) {
      this._emitter.dispose();
      this._emitter = undefined;
    }
  }
}

export class CancellationTokenSource {
  private _token: CancellationToken | undefined;

  get token(): CancellationToken {
    if (!this._token) {
      // be lazy and create the token only when
      // actually needed
      this._token = new MutableToken();
    }
    return this._token;
  }

  cancel(): void {
    if (!this._token) {
      // save an object by returning the default
      // cancelled token when cancellation happens
      // before someone asks for the token
      this._token = CancellationToken.Cancelled;
    } else if (this._token !== CancellationToken.Cancelled) {
      (<MutableToken>this._token).cancel();
    }
  }

  dispose(): void {
    this.cancel();
  }
}

const cancelledMessage = 'Cancelled';

export function cancelled(): Error {
  return new Error(cancelledMessage);
}

export function isCancelled(err: Error | undefined): boolean {
  return !!err && err.message === cancelledMessage;
}

export function checkCancelled(token?: CancellationToken): void {
  if (!!token && token.isCancellationRequested) {
    throw cancelled();
  }
}
