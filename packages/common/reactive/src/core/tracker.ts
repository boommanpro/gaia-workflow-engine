/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/**
 * Fork from: https://github.com/meteor/meteor/blob/devel/packages/tracker/tracker.js
 */
type ICallback<ARG = void, RET = void> = (arg: ARG) => RET;

/**
 * Tracker 是一套 响应式依赖追踪 库，来源于 Meteor.Tracker
 * https://docs.meteor.com/api/Tracker.html#tracker-autorun-and-async-callbacks
 * https://github.com/meteor/meteor/blob/devel/packages/tracker/tracker.js
 *
 * 相关论文：https://dl.acm.org/doi/fullHtml/10.1145/3184558.3185978
 */
export namespace Tracker {
  const _pendingComputations: Computation[] = [];
  const _afterFlushCallbacks: ICallback[] = [];
  // `true` if a Tracker.flush is scheduled, or if we are in Tracker.flush now
  let _willFlush = false;
  // `true` if we are in Tracker.flush now
  let _inFlush = false;
  // `true` if we are computing a computation now, either first time
  // or recompute.  This matches Tracker.active unless we are inside
  // Tracker.nonreactive, which nullfies currentComputation even though
  // an enclosing computation may still be running.
  let _inCompute = false;
  let _currentComputation: Computation | undefined = undefined;
  // `true` if the `_throwFirstError` option was passed in to the call
  // to Tracker.flush that we are in. When set, throw rather than log the
  // first error encountered while flushing. Before throwing the error,
  // finish flushing (from a finally block), logging any subsequent
  // errors.
  let _throwFirstError = false;

  export interface FlushOptions {
    finishSynchronously?: boolean;
    throwFirstError?: boolean;
  }

  function _throwOrLog(msg: string, e: any) {
    if (_throwFirstError) {
      throw e;
    } else {
      console.error(`[Tracker error] ${msg}`, e);
    }
  }

  // Run all pending computations and afterFlush callbacks.  If we were not called
  // directly via Tracker.flush, this may return before they're all done to allow
  // the event loop to run a little before continuing.
  function _runFlush(options?: FlushOptions) {
    // Nested flush could plausibly happen if, say, a flush causes
    // DOM mutation, which causes a "blur" event, which runs an
    // app event handler that calls Tracker.flush.  At the moment
    // Spark blocks event handlers during DOM mutation anyway,
    // because the LiveRange tree isn't valid.  And we don't have
    // any useful notion of a nested flush.
    if (inFlush()) throw new Error("Can't call Tracker.flush while flushing");

    if (_inCompute) throw new Error("Can't flush inside Tracker.autorun");

    options = options || {};

    _inFlush = true;
    _willFlush = true;
    _throwFirstError = !!options.throwFirstError;

    var recomputedCount = 0;
    var finishedTry = false;
    try {
      while (_pendingComputations.length || _afterFlushCallbacks.length) {
        // recompute all pending computations
        while (_pendingComputations.length) {
          var comp = _pendingComputations.shift()!;
          comp._recompute();
          if (comp._needsRecompute()) {
            _pendingComputations.unshift(comp);
          }

          if (!options.finishSynchronously && ++recomputedCount > 100) {
            finishedTry = true;
            return;
          }
        }

        if (_afterFlushCallbacks.length) {
          // call one afterFlush callback, which may
          // invalidate more computations
          var func = _afterFlushCallbacks.shift()!;
          try {
            func();
          } catch (e: any) {
            _throwOrLog('afterFlush', e);
          }
        }
      }
      finishedTry = true;
    } finally {
      if (!finishedTry) {
        // we're erroring due to throwFirstError being true.
        _inFlush = false; // needed before calling `Tracker.flush()` again
        // finish flushing
        _runFlush({
          finishSynchronously: options.finishSynchronously,
          throwFirstError: false,
        });
      }
      _willFlush = false;
      _inFlush = false;
      if (_pendingComputations.length || _afterFlushCallbacks.length) {
        // We're yielding because we ran a bunch of computations and we aren't
        // required to finish synchronously, so we'd like to give the event loop a
        // chance. We should flush again soon.
        if (options.finishSynchronously) {
          throw new Error('still have more to do?'); // shouldn't happen
        }
        setTimeout(_requireFlush, 10);
      }
    }
  }

  function _requireFlush() {
    if (!_willFlush) {
      setTimeout(_runFlush, 0);
      _willFlush = true;
    }
  }

  /******************************** Tracker Base API ******************************************/

  /**
   * 函数在响应式模块中执行
   * @param computation
   * @param f
   */
  export function withComputation<T = any>(
    computation: Computation,
    f: ICallback<Computation, T>,
  ): T {
    let previousComputation = _currentComputation;
    _currentComputation = computation;
    try {
      return f.call(null, computation);
    } finally {
      _currentComputation = previousComputation;
    }
  }

  /**
   * 函数在非响应式模块中执行
   */
  export function withoutComputation<T = any>(f: ICallback<undefined, T>): T {
    let previousComputation = _currentComputation;
    _currentComputation = undefined;
    try {
      return f(undefined);
    } finally {
      _currentComputation = previousComputation;
    }
  }

  export function isActive(): boolean {
    return !!_currentComputation;
  }

  export function getCurrentComputation(): Computation | undefined {
    return _currentComputation;
  }

  /**
   * Run a function now and rerun it later whenever its dependencies
   * change. Returns a Computation object that can be used to stop or observe the
   * rerunning.
   */
  export function autorun<T = any>(
    f: IComputationCallback<T>,
    options?: { onError: ICallback<Error> },
  ): Computation<T> {
    var c = new Computation<T>(f, _currentComputation, options?.onError);

    if (isActive())
      Tracker.onInvalidate(function () {
        c.stop();
      });

    return c;
  }

  export function onInvalidate(f: ICallback<Computation | undefined>) {
    if (!_currentComputation) {
      throw new Error('Tracker.onInvalidate requires a currentComputation');
    }
    _currentComputation.onInvalidate(f);
  }

  /**
   * True if we are computing a computation now, either first time or recompute.  This matches Tracker.active unless we are inside Tracker.nonreactive, which nullfies currentComputation even though an enclosing computation may still be running.
   */
  export function inFlush(): boolean {
    return _inFlush;
  }

  /**
   * Process all reactive updates immediately and ensure that all invalidated computations are rerun.
   */
  export function flush(options?: Omit<FlushOptions, 'finishSynchronously'>) {
    _runFlush({
      finishSynchronously: true,
      throwFirstError: options && options.throwFirstError,
    });
  }

  /**
   * Schedules a function to be called during the next flush, or later in the current flush if one is in progress, after all invalidated computations have been rerun.  The function will be run once and not on subsequent flushes unless `afterFlush` is called again.
   */
  export function afterFlush(f: ICallback) {
    _afterFlushCallbacks.push(f);
    _requireFlush();
  }

  /********************************************************************************************/

  export type IComputationCallback<V = any> = ICallback<Computation, V>;

  /**
   * A Computation object represents code that is repeatedly rerun
   * in response to
   * reactive data changes. Computations don't have return values; they just
   * perform actions, such as rerendering a template on the screen. Computations
   * are created using Tracker.autorun. Use stop to prevent further rerunning of a
   * computation.
   */
  export class Computation<V = any> {
    private _onInvalidateCallbacks: IComputationCallback[] = [];

    private _onStopCallbacks: IComputationCallback[] = [];

    private _recomputing = false;

    private _result: V;

    /**
     * 是否停止
     */
    public stopped = false;

    /**
     * 未开始执行则返回 false
     */
    public invalidated = false;

    /**
     * 是否第一次执行
     */
    public firstRun = true;

    constructor(
      private _fn: IComputationCallback<V>,
      public readonly parent?: Computation,
      private readonly _onError?: ICallback<Error>,
    ) {
      let hasError = true;
      try {
        this._compute();
        hasError = false;
      } finally {
        this.firstRun = false;
        if (hasError) {
          this.stop();
        }
      }
    }

    onInvalidate(f: IComputationCallback): void {
      if (this.invalidated) {
        withoutComputation(f.bind(null, this));
      } else {
        this._onInvalidateCallbacks.push(f);
      }
    }

    /**
     * @summary Invalidates this computation so that it will be rerun.
     */
    invalidate() {
      if (!this.invalidated) {
        // if we're currently in _recompute(), don't enqueue
        // ourselves, since we'll rerun immediately anyway.
        if (!this._recomputing && !this.stopped) {
          _requireFlush();
          _pendingComputations.push(this);
        }

        this.invalidated = true;

        // callbacks can't add callbacks, because
        // this.invalidated === true.
        for (var i = 0, f: IComputationCallback; (f = this._onInvalidateCallbacks[i]); i++) {
          withoutComputation(f.bind(null, this));
        }
        this._onInvalidateCallbacks = [];
      }
    }

    /**
     * @summary Prevents this computation from rerunning.
     * @locus Client
     */
    stop() {
      if (!this.stopped) {
        this.stopped = true;
        this.invalidate();
        for (let i = 0, f: IComputationCallback; (f = this._onStopCallbacks[i]); i++) {
          withoutComputation(f.bind(null, this));
        }
        this._onStopCallbacks = [];
      }
    }

    onStop(f: IComputationCallback): void {
      if (this.stopped) {
        withoutComputation(f.bind(null, this));
      } else {
        this._onStopCallbacks.push(f);
      }
    }

    private _compute(): void {
      this.invalidated = false;

      var previousInCompute = _inCompute;
      _inCompute = true;
      try {
        this._result = Tracker.withComputation<V>(this, this._fn);
      } finally {
        _inCompute = previousInCompute;
      }
    }

    _needsRecompute() {
      return this.invalidated && !this.stopped;
    }

    _recompute() {
      this._recomputing = true;
      try {
        if (this._needsRecompute()) {
          try {
            this._compute();
          } catch (e: any) {
            if (this._onError) {
              this._onError(e);
            } else {
              _throwOrLog('recompute', e);
            }
          }
        }
      } finally {
        this._recomputing = false;
      }
    }

    /**
     * @summary Process the reactive updates for this computation immediately
     * and ensure that the computation is rerun. The computation is rerun only
     * if it is invalidated.
     */
    flush() {
      if (this._recomputing) return;

      this._recompute();
    }

    /**
     * @summary Causes the function inside this computation to run and
     * synchronously process all reactive updtes.
     * @locus Client
     */
    run() {
      this.invalidate();
      this.flush();
    }

    get result(): V {
      return this._result;
    }
  }

  /**
   * A Dependency represents an atomic unit of reactive data that a
   * computation might depend on. Reactive data sources such as Session or
   * Minimongo internally create different Dependency objects for different
   * pieces of data, each of which may be depended on by multiple computations.
   * When the data changes, the computations are invalidated.
   */
  export class Dependency {
    private _dependents: Set<Computation> = new Set<Computation>();

    /**
     * Declares that the current computation (or `fromComputation` if given) depends on `dependency`.  The computation will be invalidated the next time `dependency` changes.
     * If there is no current computation and `depend()` is called with no arguments, it does nothing and returns false.
     * Returns true if the computation is a new dependent of `dependency` rather than an existing one.
     */
    depend(computation?: Computation): boolean {
      if (!computation) {
        if (!isActive()) {
          return false;
        }
        computation = _currentComputation;
      }
      if (!this._dependents.has(computation!)) {
        this._dependents.add(computation!);
        computation!.onInvalidate(() => {
          this._dependents.delete(computation!);
        });
        return true;
      }
      return false;
    }

    /**
     * Invalidate all dependent computations immediately and remove them as dependents.
     */
    changed() {
      for (const dep of this._dependents) {
        dep.invalidate();
      }
    }

    /**
     * True if this Dependency has one or more dependent Computations, which would be invalidated if this Dependency were to change.
     */
    hasDependents() {
      return this._dependents.size !== 0;
    }
  }
}
