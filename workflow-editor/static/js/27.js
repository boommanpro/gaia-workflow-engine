"use strict";
(self["webpackChunk_flowgram_ai_demo_free_layout"] = self["webpackChunk_flowgram_ai_demo_free_layout"] || []).push([["27"], {
2886: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  equalsIfDefined: () => (equalsIfDefined),
  itemEquals: () => (itemEquals),
  itemsEquals: () => (itemsEquals),
  strictEquals: () => (strictEquals),
  structuralEquals: () => (structuralEquals)
});
/* ESM import */var _arrays_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2640);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Compares two items for equality using strict equality.
*/
const strictEquals = (a, b) => a === b;
/**
 * Checks if the items of two arrays are equal.
 * By default, strict equality is used to compare elements, but a custom equality comparer can be provided.
 */
function itemsEquals(itemEquals = strictEquals) {
    return (a, b) => _arrays_js__WEBPACK_IMPORTED_MODULE_0__.equals(a, b, itemEquals);
}
/**
 * Uses `item.equals(other)` to determine equality.
 */
function itemEquals() {
    return (a, b) => a.equals(b);
}
function equalsIfDefined(equalsOrV1, v2, equals) {
    if (equals !== undefined) {
        const v1 = equalsOrV1;
        if (v1 === undefined || v1 === null || v2 === undefined || v2 === null) {
            return v2 === v1;
        }
        return equals(v1, v2);
    }
    else {
        const equals = equalsOrV1;
        return (v1, v2) => {
            if (v1 === undefined || v1 === null || v2 === undefined || v2 === null) {
                return v2 === v1;
            }
            return equals(v1, v2);
        };
    }
}
/**
 * Drills into arrays (items ordered) and objects (keys unordered) and uses strict equality on everything else.
*/
function structuralEquals(a, b) {
    if (a === b) {
        return true;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (!structuralEquals(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }
    if (a && typeof a === 'object' && b && typeof b === 'object') {
        if (Object.getPrototypeOf(a) === Object.prototype && Object.getPrototypeOf(b) === Object.prototype) {
            const aObj = a;
            const bObj = b;
            const keysA = Object.keys(aObj);
            const keysB = Object.keys(bObj);
            const keysBSet = new Set(keysB);
            if (keysA.length !== keysB.length) {
                return false;
            }
            for (const key of keysA) {
                if (!keysBSet.has(key)) {
                    return false;
                }
                if (!structuralEquals(aObj[key], bObj[key])) {
                    return false;
                }
            }
            return true;
        }
    }
    return false;
}
const objIds = new WeakMap();


}),
2884: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ObservablePromise: () => (/* reexport safe */ _observableInternal_promise_js__WEBPACK_IMPORTED_MODULE_4__.ObservablePromise),
  PromiseResult: () => (/* reexport safe */ _observableInternal_promise_js__WEBPACK_IMPORTED_MODULE_4__.PromiseResult),
  autorun: () => (/* reexport safe */ _observableInternal_autorun_js__WEBPACK_IMPORTED_MODULE_2__.autorun),
  autorunHandleChanges: () => (/* reexport safe */ _observableInternal_autorun_js__WEBPACK_IMPORTED_MODULE_2__.autorunHandleChanges),
  autorunOpts: () => (/* reexport safe */ _observableInternal_autorun_js__WEBPACK_IMPORTED_MODULE_2__.autorunOpts),
  autorunWithStore: () => (/* reexport safe */ _observableInternal_autorun_js__WEBPACK_IMPORTED_MODULE_2__.autorunWithStore),
  autorunWithStoreHandleChanges: () => (/* reexport safe */ _observableInternal_autorun_js__WEBPACK_IMPORTED_MODULE_2__.autorunWithStoreHandleChanges),
  constObservable: () => (/* reexport safe */ _observableInternal_utils_js__WEBPACK_IMPORTED_MODULE_3__.constObservable),
  derived: () => (/* reexport safe */ _observableInternal_derived_js__WEBPACK_IMPORTED_MODULE_1__.derived),
  derivedHandleChanges: () => (/* reexport safe */ _observableInternal_derived_js__WEBPACK_IMPORTED_MODULE_1__.derivedHandleChanges),
  derivedObservableWithCache: () => (/* reexport safe */ _observableInternal_utils_js__WEBPACK_IMPORTED_MODULE_3__.derivedObservableWithCache),
  derivedObservableWithWritableCache: () => (/* reexport safe */ _observableInternal_utils_js__WEBPACK_IMPORTED_MODULE_3__.derivedObservableWithWritableCache),
  derivedOpts: () => (/* reexport safe */ _observableInternal_derived_js__WEBPACK_IMPORTED_MODULE_1__.derivedOpts),
  derivedWithStore: () => (/* reexport safe */ _observableInternal_derived_js__WEBPACK_IMPORTED_MODULE_1__.derivedWithStore),
  disposableObservableValue: () => (/* reexport safe */ _observableInternal_base_js__WEBPACK_IMPORTED_MODULE_0__.disposableObservableValue),
  keepObserved: () => (/* reexport safe */ _observableInternal_utils_js__WEBPACK_IMPORTED_MODULE_3__.keepObserved),
  observableFromEvent: () => (/* reexport safe */ _observableInternal_utils_js__WEBPACK_IMPORTED_MODULE_3__.observableFromEvent),
  observableSignal: () => (/* reexport safe */ _observableInternal_utils_js__WEBPACK_IMPORTED_MODULE_3__.observableSignal),
  observableSignalFromEvent: () => (/* reexport safe */ _observableInternal_utils_js__WEBPACK_IMPORTED_MODULE_3__.observableSignalFromEvent),
  observableValue: () => (/* reexport safe */ _observableInternal_base_js__WEBPACK_IMPORTED_MODULE_0__.observableValue),
  observableValueOpts: () => (/* reexport safe */ _observableInternal_api_js__WEBPACK_IMPORTED_MODULE_5__.observableValueOpts),
  recomputeInitiallyAndOnChange: () => (/* reexport safe */ _observableInternal_utils_js__WEBPACK_IMPORTED_MODULE_3__.recomputeInitiallyAndOnChange),
  subtransaction: () => (/* reexport safe */ _observableInternal_base_js__WEBPACK_IMPORTED_MODULE_0__.subtransaction),
  transaction: () => (/* reexport safe */ _observableInternal_base_js__WEBPACK_IMPORTED_MODULE_0__.transaction),
  waitForState: () => (/* reexport safe */ _observableInternal_promise_js__WEBPACK_IMPORTED_MODULE_4__.waitForState)
});
/* ESM import */var _observableInternal_base_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2885);
/* ESM import */var _observableInternal_derived_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2889);
/* ESM import */var _observableInternal_autorun_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2890);
/* ESM import */var _observableInternal_utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2891);
/* ESM import */var _observableInternal_promise_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2892);
/* ESM import */var _observableInternal_api_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(2893);
/* ESM import */var _observableInternal_logging_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(2888);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/







// Remove "//" in the next line to enable logging
const enableLogging = false;
if (enableLogging) {
    (0,_observableInternal_logging_js__WEBPACK_IMPORTED_MODULE_6__.setLogger)(new _observableInternal_logging_js__WEBPACK_IMPORTED_MODULE_6__.ConsoleObservableLogger());
}


}),
2893: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  observableValueOpts: () => (observableValueOpts)
});
/* ESM import */var _equals_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2886);
/* ESM import */var _base_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2885);
/* ESM import */var _debugName_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2887);
/* ESM import */var _lazyObservableValue_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2894);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/




function observableValueOpts(options, initialValue) {
    if (options.lazy) {
        return new _lazyObservableValue_js__WEBPACK_IMPORTED_MODULE_3__.LazyObservableValue(new _debugName_js__WEBPACK_IMPORTED_MODULE_2__.DebugNameData(options.owner, options.debugName, undefined), initialValue, options.equalsFn ?? _equals_js__WEBPACK_IMPORTED_MODULE_0__.strictEquals);
    }
    return new _base_js__WEBPACK_IMPORTED_MODULE_1__.ObservableValue(new _debugName_js__WEBPACK_IMPORTED_MODULE_2__.DebugNameData(options.owner, options.debugName, undefined), initialValue, options.equalsFn ?? _equals_js__WEBPACK_IMPORTED_MODULE_0__.strictEquals);
}


}),
2890: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  AutorunObserver: () => (AutorunObserver),
  autorun: () => (autorun),
  autorunHandleChanges: () => (autorunHandleChanges),
  autorunOpts: () => (autorunOpts),
  autorunWithStore: () => (autorunWithStore),
  autorunWithStoreHandleChanges: () => (autorunWithStoreHandleChanges)
});
/* ESM import */var _assert_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2708);
/* ESM import */var _lifecycle_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2655);
/* ESM import */var _debugName_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2887);
/* ESM import */var _logging_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2888);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/




/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 */
function autorun(fn) {
    return new AutorunObserver(new _debugName_js__WEBPACK_IMPORTED_MODULE_2__.DebugNameData(undefined, undefined, fn), fn, undefined, undefined);
}
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 */
function autorunOpts(options, fn) {
    return new AutorunObserver(new _debugName_js__WEBPACK_IMPORTED_MODULE_2__.DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? fn), fn, undefined, undefined);
}
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 *
 * Use `createEmptyChangeSummary` to create a "change summary" that can collect the changes.
 * Use `handleChange` to add a reported change to the change summary.
 * The run function is given the last change summary.
 * The change summary is discarded after the run function was called.
 *
 * @see autorun
 */
function autorunHandleChanges(options, fn) {
    return new AutorunObserver(new _debugName_js__WEBPACK_IMPORTED_MODULE_2__.DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? fn), fn, options.createEmptyChangeSummary, options.handleChange);
}
/**
 * @see autorunHandleChanges (but with a disposable store that is cleared before the next run or on dispose)
 */
function autorunWithStoreHandleChanges(options, fn) {
    const store = new _lifecycle_js__WEBPACK_IMPORTED_MODULE_1__.DisposableStore();
    const disposable = autorunHandleChanges({
        owner: options.owner,
        debugName: options.debugName,
        debugReferenceFn: options.debugReferenceFn ?? fn,
        createEmptyChangeSummary: options.createEmptyChangeSummary,
        handleChange: options.handleChange,
    }, (reader, changeSummary) => {
        store.clear();
        fn(reader, changeSummary, store);
    });
    return (0,_lifecycle_js__WEBPACK_IMPORTED_MODULE_1__.toDisposable)(() => {
        disposable.dispose();
        store.dispose();
    });
}
/**
 * @see autorun (but with a disposable store that is cleared before the next run or on dispose)
 */
function autorunWithStore(fn) {
    const store = new _lifecycle_js__WEBPACK_IMPORTED_MODULE_1__.DisposableStore();
    const disposable = autorunOpts({
        owner: undefined,
        debugName: undefined,
        debugReferenceFn: fn,
    }, reader => {
        store.clear();
        fn(reader, store);
    });
    return (0,_lifecycle_js__WEBPACK_IMPORTED_MODULE_1__.toDisposable)(() => {
        disposable.dispose();
        store.dispose();
    });
}
class AutorunObserver {
    get debugName() {
        return this._debugNameData.getDebugName(this) ?? '(anonymous)';
    }
    constructor(_debugNameData, _runFn, createChangeSummary, _handleChange) {
        this._debugNameData = _debugNameData;
        this._runFn = _runFn;
        this.createChangeSummary = createChangeSummary;
        this._handleChange = _handleChange;
        this.state = 2 /* AutorunState.stale */;
        this.updateCount = 0;
        this.disposed = false;
        this.dependencies = new Set();
        this.dependenciesToBeRemoved = new Set();
        this.changeSummary = this.createChangeSummary?.();
        (0,_logging_js__WEBPACK_IMPORTED_MODULE_3__.getLogger)()?.handleAutorunCreated(this);
        this._runIfNeeded();
        (0,_lifecycle_js__WEBPACK_IMPORTED_MODULE_1__.trackDisposable)(this);
    }
    dispose() {
        this.disposed = true;
        for (const o of this.dependencies) {
            o.removeObserver(this);
        }
        this.dependencies.clear();
        (0,_lifecycle_js__WEBPACK_IMPORTED_MODULE_1__.markAsDisposed)(this);
    }
    _runIfNeeded() {
        if (this.state === 3 /* AutorunState.upToDate */) {
            return;
        }
        const emptySet = this.dependenciesToBeRemoved;
        this.dependenciesToBeRemoved = this.dependencies;
        this.dependencies = emptySet;
        this.state = 3 /* AutorunState.upToDate */;
        const isDisposed = this.disposed;
        try {
            if (!isDisposed) {
                (0,_logging_js__WEBPACK_IMPORTED_MODULE_3__.getLogger)()?.handleAutorunTriggered(this);
                const changeSummary = this.changeSummary;
                this.changeSummary = this.createChangeSummary?.();
                this._runFn(this, changeSummary);
            }
        }
        finally {
            if (!isDisposed) {
                (0,_logging_js__WEBPACK_IMPORTED_MODULE_3__.getLogger)()?.handleAutorunFinished(this);
            }
            // We don't want our observed observables to think that they are (not even temporarily) not being observed.
            // Thus, we only unsubscribe from observables that are definitely not read anymore.
            for (const o of this.dependenciesToBeRemoved) {
                o.removeObserver(this);
            }
            this.dependenciesToBeRemoved.clear();
        }
    }
    toString() {
        return `Autorun<${this.debugName}>`;
    }
    // IObserver implementation
    beginUpdate() {
        if (this.state === 3 /* AutorunState.upToDate */) {
            this.state = 1 /* AutorunState.dependenciesMightHaveChanged */;
        }
        this.updateCount++;
    }
    endUpdate() {
        if (this.updateCount === 1) {
            do {
                if (this.state === 1 /* AutorunState.dependenciesMightHaveChanged */) {
                    this.state = 3 /* AutorunState.upToDate */;
                    for (const d of this.dependencies) {
                        d.reportChanges();
                        if (this.state === 2 /* AutorunState.stale */) {
                            // The other dependencies will refresh on demand
                            break;
                        }
                    }
                }
                this._runIfNeeded();
            } while (this.state !== 3 /* AutorunState.upToDate */);
        }
        this.updateCount--;
        (0,_assert_js__WEBPACK_IMPORTED_MODULE_0__.assertFn)(() => this.updateCount >= 0);
    }
    handlePossibleChange(observable) {
        if (this.state === 3 /* AutorunState.upToDate */ && this.dependencies.has(observable) && !this.dependenciesToBeRemoved.has(observable)) {
            this.state = 1 /* AutorunState.dependenciesMightHaveChanged */;
        }
    }
    handleChange(observable, change) {
        if (this.dependencies.has(observable) && !this.dependenciesToBeRemoved.has(observable)) {
            const shouldReact = this._handleChange ? this._handleChange({
                changedObservable: observable,
                change,
                didChange: (o) => o === observable,
            }, this.changeSummary) : true;
            if (shouldReact) {
                this.state = 2 /* AutorunState.stale */;
            }
        }
    }
    // IReader implementation
    readObservable(observable) {
        // In case the run action disposes the autorun
        if (this.disposed) {
            return observable.get();
        }
        observable.addObserver(this);
        const value = observable.get();
        this.dependencies.add(observable);
        this.dependenciesToBeRemoved.delete(observable);
        return value;
    }
}
(function (autorun) {
    autorun.Observer = AutorunObserver;
})(autorun || (autorun = {}));


}),
2885: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  BaseObservable: () => (BaseObservable),
  ConvenientObservable: () => (ConvenientObservable),
  DisposableObservableValue: () => (DisposableObservableValue),
  ObservableValue: () => (ObservableValue),
  TransactionImpl: () => (TransactionImpl),
  _setDerivedOpts: () => (_setDerivedOpts),
  _setKeepObserved: () => (_setKeepObserved),
  _setRecomputeInitiallyAndOnChange: () => (_setRecomputeInitiallyAndOnChange),
  asyncTransaction: () => (asyncTransaction),
  disposableObservableValue: () => (disposableObservableValue),
  globalTransaction: () => (globalTransaction),
  observableValue: () => (observableValue),
  subtransaction: () => (subtransaction),
  transaction: () => (transaction)
});
/* ESM import */var _equals_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2886);
/* ESM import */var _debugName_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2887);
/* ESM import */var _logging_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2888);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/



let _recomputeInitiallyAndOnChange;
function _setRecomputeInitiallyAndOnChange(recomputeInitiallyAndOnChange) {
    _recomputeInitiallyAndOnChange = recomputeInitiallyAndOnChange;
}
let _keepObserved;
function _setKeepObserved(keepObserved) {
    _keepObserved = keepObserved;
}
let _derived;
/**
 * @internal
 * This is to allow splitting files.
*/
function _setDerivedOpts(derived) {
    _derived = derived;
}
class ConvenientObservable {
    get TChange() { return null; }
    reportChanges() {
        this.get();
    }
    /** @sealed */
    read(reader) {
        if (reader) {
            return reader.readObservable(this);
        }
        else {
            return this.get();
        }
    }
    map(fnOrOwner, fnOrUndefined) {
        const owner = fnOrUndefined === undefined ? undefined : fnOrOwner;
        const fn = fnOrUndefined === undefined ? fnOrOwner : fnOrUndefined;
        return _derived({
            owner,
            debugName: () => {
                const name = (0,_debugName_js__WEBPACK_IMPORTED_MODULE_1__.getFunctionName)(fn);
                if (name !== undefined) {
                    return name;
                }
                // regexp to match `x => x.y` or `x => x?.y` where x and y can be arbitrary identifiers (uses backref):
                const regexp = /^\s*\(?\s*([a-zA-Z_$][a-zA-Z_$0-9]*)\s*\)?\s*=>\s*\1(?:\??)\.([a-zA-Z_$][a-zA-Z_$0-9]*)\s*$/;
                const match = regexp.exec(fn.toString());
                if (match) {
                    return `${this.debugName}.${match[2]}`;
                }
                if (!owner) {
                    return `${this.debugName} (mapped)`;
                }
                return undefined;
            },
            debugReferenceFn: fn,
        }, (reader) => fn(this.read(reader), reader));
    }
    /**
     * @sealed
     * Converts an observable of an observable value into a direct observable of the value.
    */
    flatten() {
        return _derived({
            owner: undefined,
            debugName: () => `${this.debugName} (flattened)`,
        }, (reader) => this.read(reader).read(reader));
    }
    recomputeInitiallyAndOnChange(store, handleValue) {
        store.add(_recomputeInitiallyAndOnChange(this, handleValue));
        return this;
    }
    /**
     * Ensures that this observable is observed. This keeps the cache alive.
     * However, in case of deriveds, it does not force eager evaluation (only when the value is read/get).
     * Use `recomputeInitiallyAndOnChange` for eager evaluation.
     */
    keepObserved(store) {
        store.add(_keepObserved(this));
        return this;
    }
}
class BaseObservable extends ConvenientObservable {
    constructor() {
        super(...arguments);
        this.observers = new Set();
    }
    addObserver(observer) {
        const len = this.observers.size;
        this.observers.add(observer);
        if (len === 0) {
            this.onFirstObserverAdded();
        }
    }
    removeObserver(observer) {
        const deleted = this.observers.delete(observer);
        if (deleted && this.observers.size === 0) {
            this.onLastObserverRemoved();
        }
    }
    onFirstObserverAdded() { }
    onLastObserverRemoved() { }
}
/**
 * Starts a transaction in which many observables can be changed at once.
 * {@link fn} should start with a JS Doc using `@description` to give the transaction a debug name.
 * Reaction run on demand or when the transaction ends.
 */
function transaction(fn, getDebugName) {
    const tx = new TransactionImpl(fn, getDebugName);
    try {
        fn(tx);
    }
    finally {
        tx.finish();
    }
}
let _globalTransaction = undefined;
function globalTransaction(fn) {
    if (_globalTransaction) {
        fn(_globalTransaction);
    }
    else {
        const tx = new TransactionImpl(fn, undefined);
        _globalTransaction = tx;
        try {
            fn(tx);
        }
        finally {
            tx.finish(); // During finish, more actions might be added to the transaction.
            // Which is why we only clear the global transaction after finish.
            _globalTransaction = undefined;
        }
    }
}
async function asyncTransaction(fn, getDebugName) {
    const tx = new TransactionImpl(fn, getDebugName);
    try {
        await fn(tx);
    }
    finally {
        tx.finish();
    }
}
/**
 * Allows to chain transactions.
 */
function subtransaction(tx, fn, getDebugName) {
    if (!tx) {
        transaction(fn, getDebugName);
    }
    else {
        fn(tx);
    }
}
class TransactionImpl {
    constructor(_fn, _getDebugName) {
        this._fn = _fn;
        this._getDebugName = _getDebugName;
        this.updatingObservers = [];
        (0,_logging_js__WEBPACK_IMPORTED_MODULE_2__.getLogger)()?.handleBeginTransaction(this);
    }
    getDebugName() {
        if (this._getDebugName) {
            return this._getDebugName();
        }
        return (0,_debugName_js__WEBPACK_IMPORTED_MODULE_1__.getFunctionName)(this._fn);
    }
    updateObserver(observer, observable) {
        // When this gets called while finish is active, they will still get considered
        this.updatingObservers.push({ observer, observable });
        observer.beginUpdate(observable);
    }
    finish() {
        const updatingObservers = this.updatingObservers;
        for (let i = 0; i < updatingObservers.length; i++) {
            const { observer, observable } = updatingObservers[i];
            observer.endUpdate(observable);
        }
        // Prevent anyone from updating observers from now on.
        this.updatingObservers = null;
        (0,_logging_js__WEBPACK_IMPORTED_MODULE_2__.getLogger)()?.handleEndTransaction();
    }
}
function observableValue(nameOrOwner, initialValue) {
    let debugNameData;
    if (typeof nameOrOwner === 'string') {
        debugNameData = new _debugName_js__WEBPACK_IMPORTED_MODULE_1__.DebugNameData(undefined, nameOrOwner, undefined);
    }
    else {
        debugNameData = new _debugName_js__WEBPACK_IMPORTED_MODULE_1__.DebugNameData(nameOrOwner, undefined, undefined);
    }
    return new ObservableValue(debugNameData, initialValue, _equals_js__WEBPACK_IMPORTED_MODULE_0__.strictEquals);
}
class ObservableValue extends BaseObservable {
    get debugName() {
        return this._debugNameData.getDebugName(this) ?? 'ObservableValue';
    }
    constructor(_debugNameData, initialValue, _equalityComparator) {
        super();
        this._debugNameData = _debugNameData;
        this._equalityComparator = _equalityComparator;
        this._value = initialValue;
    }
    get() {
        return this._value;
    }
    set(value, tx, change) {
        if (change === undefined && this._equalityComparator(this._value, value)) {
            return;
        }
        let _tx;
        if (!tx) {
            tx = _tx = new TransactionImpl(() => { }, () => `Setting ${this.debugName}`);
        }
        try {
            const oldValue = this._value;
            this._setValue(value);
            (0,_logging_js__WEBPACK_IMPORTED_MODULE_2__.getLogger)()?.handleObservableChanged(this, { oldValue, newValue: value, change, didChange: true, hadValue: true });
            for (const observer of this.observers) {
                tx.updateObserver(observer, this);
                observer.handleChange(this, change);
            }
        }
        finally {
            if (_tx) {
                _tx.finish();
            }
        }
    }
    toString() {
        return `${this.debugName}: ${this._value}`;
    }
    _setValue(newValue) {
        this._value = newValue;
    }
}
/**
 * A disposable observable. When disposed, its value is also disposed.
 * When a new value is set, the previous value is disposed.
 */
function disposableObservableValue(nameOrOwner, initialValue) {
    let debugNameData;
    if (typeof nameOrOwner === 'string') {
        debugNameData = new _debugName_js__WEBPACK_IMPORTED_MODULE_1__.DebugNameData(undefined, nameOrOwner, undefined);
    }
    else {
        debugNameData = new _debugName_js__WEBPACK_IMPORTED_MODULE_1__.DebugNameData(nameOrOwner, undefined, undefined);
    }
    return new DisposableObservableValue(debugNameData, initialValue, _equals_js__WEBPACK_IMPORTED_MODULE_0__.strictEquals);
}
class DisposableObservableValue extends ObservableValue {
    _setValue(newValue) {
        if (this._value === newValue) {
            return;
        }
        if (this._value) {
            this._value.dispose();
        }
        this._value = newValue;
    }
    dispose() {
        this._value?.dispose();
    }
}


}),
2887: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  DebugNameData: () => (DebugNameData),
  getDebugName: () => (getDebugName),
  getFunctionName: () => (getFunctionName)
});
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class DebugNameData {
    constructor(owner, debugNameSource, referenceFn) {
        this.owner = owner;
        this.debugNameSource = debugNameSource;
        this.referenceFn = referenceFn;
    }
    getDebugName(target) {
        return getDebugName(target, this);
    }
}
const countPerName = new Map();
const cachedDebugName = new WeakMap();
function getDebugName(target, data) {
    const cached = cachedDebugName.get(target);
    if (cached) {
        return cached;
    }
    const dbgName = computeDebugName(target, data);
    if (dbgName) {
        let count = countPerName.get(dbgName) ?? 0;
        count++;
        countPerName.set(dbgName, count);
        const result = count === 1 ? dbgName : `${dbgName}#${count}`;
        cachedDebugName.set(target, result);
        return result;
    }
    return undefined;
}
function computeDebugName(self, data) {
    const cached = cachedDebugName.get(self);
    if (cached) {
        return cached;
    }
    const ownerStr = data.owner ? formatOwner(data.owner) + `.` : '';
    let result;
    const debugNameSource = data.debugNameSource;
    if (debugNameSource !== undefined) {
        if (typeof debugNameSource === 'function') {
            result = debugNameSource();
            if (result !== undefined) {
                return ownerStr + result;
            }
        }
        else {
            return ownerStr + debugNameSource;
        }
    }
    const referenceFn = data.referenceFn;
    if (referenceFn !== undefined) {
        result = getFunctionName(referenceFn);
        if (result !== undefined) {
            return ownerStr + result;
        }
    }
    if (data.owner !== undefined) {
        const key = findKey(data.owner, self);
        if (key !== undefined) {
            return ownerStr + key;
        }
    }
    return undefined;
}
function findKey(obj, value) {
    for (const key in obj) {
        if (obj[key] === value) {
            return key;
        }
    }
    return undefined;
}
const countPerClassName = new Map();
const ownerId = new WeakMap();
function formatOwner(owner) {
    const id = ownerId.get(owner);
    if (id) {
        return id;
    }
    const className = getClassName(owner);
    let count = countPerClassName.get(className) ?? 0;
    count++;
    countPerClassName.set(className, count);
    const result = count === 1 ? className : `${className}#${count}`;
    ownerId.set(owner, result);
    return result;
}
function getClassName(obj) {
    const ctor = obj.constructor;
    if (ctor) {
        return ctor.name;
    }
    return 'Object';
}
function getFunctionName(fn) {
    const fnSrc = fn.toString();
    // Pattern: /** @description ... */
    const regexp = /\/\*\*\s*@description\s*([^*]*)\*\//;
    const match = regexp.exec(fnSrc);
    const result = match ? match[1] : undefined;
    return result?.trim();
}


}),
2889: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  Derived: () => (Derived),
  DerivedWithSetter: () => (DerivedWithSetter),
  derived: () => (derived),
  derivedDisposable: () => (derivedDisposable),
  derivedHandleChanges: () => (derivedHandleChanges),
  derivedOpts: () => (derivedOpts),
  derivedWithSetter: () => (derivedWithSetter),
  derivedWithStore: () => (derivedWithStore)
});
/* ESM import */var _assert_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2708);
/* ESM import */var _equals_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2886);
/* ESM import */var _lifecycle_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2655);
/* ESM import */var _base_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2885);
/* ESM import */var _debugName_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2887);
/* ESM import */var _logging_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(2888);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/






function derived(computeFnOrOwner, computeFn) {
    if (computeFn !== undefined) {
        return new Derived(new _debugName_js__WEBPACK_IMPORTED_MODULE_4__.DebugNameData(computeFnOrOwner, undefined, computeFn), computeFn, undefined, undefined, undefined, _equals_js__WEBPACK_IMPORTED_MODULE_1__.strictEquals);
    }
    return new Derived(new _debugName_js__WEBPACK_IMPORTED_MODULE_4__.DebugNameData(undefined, undefined, computeFnOrOwner), computeFnOrOwner, undefined, undefined, undefined, _equals_js__WEBPACK_IMPORTED_MODULE_1__.strictEquals);
}
function derivedWithSetter(owner, computeFn, setter) {
    return new DerivedWithSetter(new _debugName_js__WEBPACK_IMPORTED_MODULE_4__.DebugNameData(owner, undefined, computeFn), computeFn, undefined, undefined, undefined, _equals_js__WEBPACK_IMPORTED_MODULE_1__.strictEquals, setter);
}
function derivedOpts(options, computeFn) {
    return new Derived(new _debugName_js__WEBPACK_IMPORTED_MODULE_4__.DebugNameData(options.owner, options.debugName, options.debugReferenceFn), computeFn, undefined, undefined, options.onLastObserverRemoved, options.equalsFn ?? _equals_js__WEBPACK_IMPORTED_MODULE_1__.strictEquals);
}
(0,_base_js__WEBPACK_IMPORTED_MODULE_3__._setDerivedOpts)(derivedOpts);
/**
 * Represents an observable that is derived from other observables.
 * The value is only recomputed when absolutely needed.
 *
 * {@link computeFn} should start with a JS Doc using `@description` to name the derived.
 *
 * Use `createEmptyChangeSummary` to create a "change summary" that can collect the changes.
 * Use `handleChange` to add a reported change to the change summary.
 * The compute function is given the last change summary.
 * The change summary is discarded after the compute function was called.
 *
 * @see derived
 */
function derivedHandleChanges(options, computeFn) {
    return new Derived(new _debugName_js__WEBPACK_IMPORTED_MODULE_4__.DebugNameData(options.owner, options.debugName, undefined), computeFn, options.createEmptyChangeSummary, options.handleChange, undefined, options.equalityComparer ?? _equals_js__WEBPACK_IMPORTED_MODULE_1__.strictEquals);
}
function derivedWithStore(computeFnOrOwner, computeFnOrUndefined) {
    let computeFn;
    let owner;
    if (computeFnOrUndefined === undefined) {
        computeFn = computeFnOrOwner;
        owner = undefined;
    }
    else {
        owner = computeFnOrOwner;
        computeFn = computeFnOrUndefined;
    }
    const store = new _lifecycle_js__WEBPACK_IMPORTED_MODULE_2__.DisposableStore();
    return new Derived(new _debugName_js__WEBPACK_IMPORTED_MODULE_4__.DebugNameData(owner, undefined, computeFn), r => {
        store.clear();
        return computeFn(r, store);
    }, undefined, undefined, () => store.dispose(), _equals_js__WEBPACK_IMPORTED_MODULE_1__.strictEquals);
}
function derivedDisposable(computeFnOrOwner, computeFnOrUndefined) {
    let computeFn;
    let owner;
    if (computeFnOrUndefined === undefined) {
        computeFn = computeFnOrOwner;
        owner = undefined;
    }
    else {
        owner = computeFnOrOwner;
        computeFn = computeFnOrUndefined;
    }
    let store = undefined;
    return new Derived(new _debugName_js__WEBPACK_IMPORTED_MODULE_4__.DebugNameData(owner, undefined, computeFn), r => {
        if (!store) {
            store = new _lifecycle_js__WEBPACK_IMPORTED_MODULE_2__.DisposableStore();
        }
        else {
            store.clear();
        }
        const result = computeFn(r);
        if (result) {
            store.add(result);
        }
        return result;
    }, undefined, undefined, () => {
        if (store) {
            store.dispose();
            store = undefined;
        }
    }, _equals_js__WEBPACK_IMPORTED_MODULE_1__.strictEquals);
}
class Derived extends _base_js__WEBPACK_IMPORTED_MODULE_3__.BaseObservable {
    get debugName() {
        return this._debugNameData.getDebugName(this) ?? '(anonymous)';
    }
    constructor(_debugNameData, _computeFn, createChangeSummary, _handleChange, _handleLastObserverRemoved = undefined, _equalityComparator) {
        super();
        this._debugNameData = _debugNameData;
        this._computeFn = _computeFn;
        this.createChangeSummary = createChangeSummary;
        this._handleChange = _handleChange;
        this._handleLastObserverRemoved = _handleLastObserverRemoved;
        this._equalityComparator = _equalityComparator;
        this.state = 0 /* DerivedState.initial */;
        this.value = undefined;
        this.updateCount = 0;
        this.dependencies = new Set();
        this.dependenciesToBeRemoved = new Set();
        this.changeSummary = undefined;
        this.changeSummary = this.createChangeSummary?.();
        (0,_logging_js__WEBPACK_IMPORTED_MODULE_5__.getLogger)()?.handleDerivedCreated(this);
    }
    onLastObserverRemoved() {
        /**
         * We are not tracking changes anymore, thus we have to assume
         * that our cache is invalid.
         */
        this.state = 0 /* DerivedState.initial */;
        this.value = undefined;
        for (const d of this.dependencies) {
            d.removeObserver(this);
        }
        this.dependencies.clear();
        this._handleLastObserverRemoved?.();
    }
    get() {
        if (this.observers.size === 0) {
            // Without observers, we don't know when to clean up stuff.
            // Thus, we don't cache anything to prevent memory leaks.
            const result = this._computeFn(this, this.createChangeSummary?.());
            // Clear new dependencies
            this.onLastObserverRemoved();
            return result;
        }
        else {
            do {
                // We might not get a notification for a dependency that changed while it is updating,
                // thus we also have to ask all our depedencies if they changed in this case.
                if (this.state === 1 /* DerivedState.dependenciesMightHaveChanged */) {
                    for (const d of this.dependencies) {
                        /** might call {@link handleChange} indirectly, which could make us stale */
                        d.reportChanges();
                        if (this.state === 2 /* DerivedState.stale */) {
                            // The other dependencies will refresh on demand, so early break
                            break;
                        }
                    }
                }
                // We called report changes of all dependencies.
                // If we are still not stale, we can assume to be up to date again.
                if (this.state === 1 /* DerivedState.dependenciesMightHaveChanged */) {
                    this.state = 3 /* DerivedState.upToDate */;
                }
                this._recomputeIfNeeded();
                // In case recomputation changed one of our dependencies, we need to recompute again.
            } while (this.state !== 3 /* DerivedState.upToDate */);
            return this.value;
        }
    }
    _recomputeIfNeeded() {
        if (this.state === 3 /* DerivedState.upToDate */) {
            return;
        }
        const emptySet = this.dependenciesToBeRemoved;
        this.dependenciesToBeRemoved = this.dependencies;
        this.dependencies = emptySet;
        const hadValue = this.state !== 0 /* DerivedState.initial */;
        const oldValue = this.value;
        this.state = 3 /* DerivedState.upToDate */;
        const changeSummary = this.changeSummary;
        this.changeSummary = this.createChangeSummary?.();
        try {
            /** might call {@link handleChange} indirectly, which could invalidate us */
            this.value = this._computeFn(this, changeSummary);
        }
        finally {
            // We don't want our observed observables to think that they are (not even temporarily) not being observed.
            // Thus, we only unsubscribe from observables that are definitely not read anymore.
            for (const o of this.dependenciesToBeRemoved) {
                o.removeObserver(this);
            }
            this.dependenciesToBeRemoved.clear();
        }
        const didChange = hadValue && !(this._equalityComparator(oldValue, this.value));
        (0,_logging_js__WEBPACK_IMPORTED_MODULE_5__.getLogger)()?.handleDerivedRecomputed(this, {
            oldValue,
            newValue: this.value,
            change: undefined,
            didChange,
            hadValue,
        });
        if (didChange) {
            for (const r of this.observers) {
                r.handleChange(this, undefined);
            }
        }
    }
    toString() {
        return `LazyDerived<${this.debugName}>`;
    }
    // IObserver Implementation
    beginUpdate(_observable) {
        this.updateCount++;
        const propagateBeginUpdate = this.updateCount === 1;
        if (this.state === 3 /* DerivedState.upToDate */) {
            this.state = 1 /* DerivedState.dependenciesMightHaveChanged */;
            // If we propagate begin update, that will already signal a possible change.
            if (!propagateBeginUpdate) {
                for (const r of this.observers) {
                    r.handlePossibleChange(this);
                }
            }
        }
        if (propagateBeginUpdate) {
            for (const r of this.observers) {
                r.beginUpdate(this); // This signals a possible change
            }
        }
    }
    endUpdate(_observable) {
        this.updateCount--;
        if (this.updateCount === 0) {
            // End update could change the observer list.
            const observers = [...this.observers];
            for (const r of observers) {
                r.endUpdate(this);
            }
        }
        (0,_assert_js__WEBPACK_IMPORTED_MODULE_0__.assertFn)(() => this.updateCount >= 0);
    }
    handlePossibleChange(observable) {
        // In all other states, observers already know that we might have changed.
        if (this.state === 3 /* DerivedState.upToDate */ && this.dependencies.has(observable) && !this.dependenciesToBeRemoved.has(observable)) {
            this.state = 1 /* DerivedState.dependenciesMightHaveChanged */;
            for (const r of this.observers) {
                r.handlePossibleChange(this);
            }
        }
    }
    handleChange(observable, change) {
        if (this.dependencies.has(observable) && !this.dependenciesToBeRemoved.has(observable)) {
            const shouldReact = this._handleChange ? this._handleChange({
                changedObservable: observable,
                change,
                didChange: (o) => o === observable,
            }, this.changeSummary) : true;
            const wasUpToDate = this.state === 3 /* DerivedState.upToDate */;
            if (shouldReact && (this.state === 1 /* DerivedState.dependenciesMightHaveChanged */ || wasUpToDate)) {
                this.state = 2 /* DerivedState.stale */;
                if (wasUpToDate) {
                    for (const r of this.observers) {
                        r.handlePossibleChange(this);
                    }
                }
            }
        }
    }
    // IReader Implementation
    readObservable(observable) {
        // Subscribe before getting the value to enable caching
        observable.addObserver(this);
        /** This might call {@link handleChange} indirectly, which could invalidate us */
        const value = observable.get();
        // Which is why we only add the observable to the dependencies now.
        this.dependencies.add(observable);
        this.dependenciesToBeRemoved.delete(observable);
        return value;
    }
    addObserver(observer) {
        const shouldCallBeginUpdate = !this.observers.has(observer) && this.updateCount > 0;
        super.addObserver(observer);
        if (shouldCallBeginUpdate) {
            observer.beginUpdate(this);
        }
    }
    removeObserver(observer) {
        const shouldCallEndUpdate = this.observers.has(observer) && this.updateCount > 0;
        super.removeObserver(observer);
        if (shouldCallEndUpdate) {
            // Calling end update after removing the observer makes sure endUpdate cannot be called twice here.
            observer.endUpdate(this);
        }
    }
}
class DerivedWithSetter extends Derived {
    constructor(debugNameData, computeFn, createChangeSummary, handleChange, handleLastObserverRemoved = undefined, equalityComparator, set) {
        super(debugNameData, computeFn, createChangeSummary, handleChange, handleLastObserverRemoved, equalityComparator);
        this.set = set;
    }
}


}),
2894: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  LazyObservableValue: () => (LazyObservableValue)
});
/* ESM import */var _base_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2885);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Holds off updating observers until the value is actually read.
*/
class LazyObservableValue extends _base_js__WEBPACK_IMPORTED_MODULE_0__.BaseObservable {
    get debugName() {
        return this._debugNameData.getDebugName(this) ?? 'LazyObservableValue';
    }
    constructor(_debugNameData, initialValue, _equalityComparator) {
        super();
        this._debugNameData = _debugNameData;
        this._equalityComparator = _equalityComparator;
        this._isUpToDate = true;
        this._deltas = [];
        this._updateCounter = 0;
        this._value = initialValue;
    }
    get() {
        this._update();
        return this._value;
    }
    _update() {
        if (this._isUpToDate) {
            return;
        }
        this._isUpToDate = true;
        if (this._deltas.length > 0) {
            for (const observer of this.observers) {
                for (const change of this._deltas) {
                    observer.handleChange(this, change);
                }
            }
            this._deltas.length = 0;
        }
        else {
            for (const observer of this.observers) {
                observer.handleChange(this, undefined);
            }
        }
    }
    _beginUpdate() {
        this._updateCounter++;
        if (this._updateCounter === 1) {
            for (const observer of this.observers) {
                observer.beginUpdate(this);
            }
        }
    }
    _endUpdate() {
        this._updateCounter--;
        if (this._updateCounter === 0) {
            this._update();
            // End update could change the observer list.
            const observers = [...this.observers];
            for (const r of observers) {
                r.endUpdate(this);
            }
        }
    }
    addObserver(observer) {
        const shouldCallBeginUpdate = !this.observers.has(observer) && this._updateCounter > 0;
        super.addObserver(observer);
        if (shouldCallBeginUpdate) {
            observer.beginUpdate(this);
        }
    }
    removeObserver(observer) {
        const shouldCallEndUpdate = this.observers.has(observer) && this._updateCounter > 0;
        super.removeObserver(observer);
        if (shouldCallEndUpdate) {
            // Calling end update after removing the observer makes sure endUpdate cannot be called twice here.
            observer.endUpdate(this);
        }
    }
    set(value, tx, change) {
        if (change === undefined && this._equalityComparator(this._value, value)) {
            return;
        }
        let _tx;
        if (!tx) {
            tx = _tx = new _base_js__WEBPACK_IMPORTED_MODULE_0__.TransactionImpl(() => { }, () => `Setting ${this.debugName}`);
        }
        try {
            this._isUpToDate = false;
            this._setValue(value);
            if (change !== undefined) {
                this._deltas.push(change);
            }
            tx.updateObserver({
                beginUpdate: () => this._beginUpdate(),
                endUpdate: () => this._endUpdate(),
                handleChange: (observable, change) => { },
                handlePossibleChange: (observable) => { },
            }, this);
            if (this._updateCounter > 1) {
                // We already started begin/end update, so we need to manually call handlePossibleChange
                for (const observer of this.observers) {
                    observer.handlePossibleChange(this);
                }
            }
        }
        finally {
            if (_tx) {
                _tx.finish();
            }
        }
    }
    toString() {
        return `${this.debugName}: ${this._value}`;
    }
    _setValue(newValue) {
        this._value = newValue;
    }
}


}),
2888: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ConsoleObservableLogger: () => (ConsoleObservableLogger),
  getLogger: () => (getLogger),
  setLogger: () => (setLogger)
});
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
let globalObservableLogger;
function setLogger(logger) {
    globalObservableLogger = logger;
}
function getLogger() {
    return globalObservableLogger;
}
class ConsoleObservableLogger {
    constructor() {
        this.indentation = 0;
        this.changedObservablesSets = new WeakMap();
    }
    textToConsoleArgs(text) {
        return consoleTextToArgs([
            normalText(repeat('|  ', this.indentation)),
            text,
        ]);
    }
    formatInfo(info) {
        if (!info.hadValue) {
            return [
                normalText(` `),
                styled(formatValue(info.newValue, 60), {
                    color: 'green',
                }),
                normalText(` (initial)`),
            ];
        }
        return info.didChange
            ? [
                normalText(` `),
                styled(formatValue(info.oldValue, 70), {
                    color: 'red',
                    strikeThrough: true,
                }),
                normalText(` `),
                styled(formatValue(info.newValue, 60), {
                    color: 'green',
                }),
            ]
            : [normalText(` (unchanged)`)];
    }
    handleObservableChanged(observable, info) {
        console.log(...this.textToConsoleArgs([
            formatKind('observable value changed'),
            styled(observable.debugName, { color: 'BlueViolet' }),
            ...this.formatInfo(info),
        ]));
    }
    formatChanges(changes) {
        if (changes.size === 0) {
            return undefined;
        }
        return styled(' (changed deps: ' +
            [...changes].map((o) => o.debugName).join(', ') +
            ')', { color: 'gray' });
    }
    handleDerivedCreated(derived) {
        const existingHandleChange = derived.handleChange;
        this.changedObservablesSets.set(derived, new Set());
        derived.handleChange = (observable, change) => {
            this.changedObservablesSets.get(derived).add(observable);
            return existingHandleChange.apply(derived, [observable, change]);
        };
    }
    handleDerivedRecomputed(derived, info) {
        const changedObservables = this.changedObservablesSets.get(derived);
        console.log(...this.textToConsoleArgs([
            formatKind('derived recomputed'),
            styled(derived.debugName, { color: 'BlueViolet' }),
            ...this.formatInfo(info),
            this.formatChanges(changedObservables),
            { data: [{ fn: derived._debugNameData.referenceFn ?? derived._computeFn }] }
        ]));
        changedObservables.clear();
    }
    handleFromEventObservableTriggered(observable, info) {
        console.log(...this.textToConsoleArgs([
            formatKind('observable from event triggered'),
            styled(observable.debugName, { color: 'BlueViolet' }),
            ...this.formatInfo(info),
            { data: [{ fn: observable._getValue }] }
        ]));
    }
    handleAutorunCreated(autorun) {
        const existingHandleChange = autorun.handleChange;
        this.changedObservablesSets.set(autorun, new Set());
        autorun.handleChange = (observable, change) => {
            this.changedObservablesSets.get(autorun).add(observable);
            return existingHandleChange.apply(autorun, [observable, change]);
        };
    }
    handleAutorunTriggered(autorun) {
        const changedObservables = this.changedObservablesSets.get(autorun);
        console.log(...this.textToConsoleArgs([
            formatKind('autorun'),
            styled(autorun.debugName, { color: 'BlueViolet' }),
            this.formatChanges(changedObservables),
            { data: [{ fn: autorun._debugNameData.referenceFn ?? autorun._runFn }] }
        ]));
        changedObservables.clear();
        this.indentation++;
    }
    handleAutorunFinished(autorun) {
        this.indentation--;
    }
    handleBeginTransaction(transaction) {
        let transactionName = transaction.getDebugName();
        if (transactionName === undefined) {
            transactionName = '';
        }
        console.log(...this.textToConsoleArgs([
            formatKind('transaction'),
            styled(transactionName, { color: 'BlueViolet' }),
            { data: [{ fn: transaction._fn }] }
        ]));
        this.indentation++;
    }
    handleEndTransaction() {
        this.indentation--;
    }
}
function consoleTextToArgs(text) {
    const styles = new Array();
    const data = [];
    let firstArg = '';
    function process(t) {
        if ('length' in t) {
            for (const item of t) {
                if (item) {
                    process(item);
                }
            }
        }
        else if ('text' in t) {
            firstArg += `%c${t.text}`;
            styles.push(t.style);
            if (t.data) {
                data.push(...t.data);
            }
        }
        else if ('data' in t) {
            data.push(...t.data);
        }
    }
    process(text);
    const result = [firstArg, ...styles];
    result.push(...data);
    return result;
}
function normalText(text) {
    return styled(text, { color: 'black' });
}
function formatKind(kind) {
    return styled(padStr(`${kind}: `, 10), { color: 'black', bold: true });
}
function styled(text, options = {
    color: 'black',
}) {
    function objToCss(styleObj) {
        return Object.entries(styleObj).reduce((styleString, [propName, propValue]) => {
            return `${styleString}${propName}:${propValue};`;
        }, '');
    }
    const style = {
        color: options.color,
    };
    if (options.strikeThrough) {
        style['text-decoration'] = 'line-through';
    }
    if (options.bold) {
        style['font-weight'] = 'bold';
    }
    return {
        text,
        style: objToCss(style),
    };
}
function formatValue(value, availableLen) {
    switch (typeof value) {
        case 'number':
            return '' + value;
        case 'string':
            if (value.length + 2 <= availableLen) {
                return `"${value}"`;
            }
            return `"${value.substr(0, availableLen - 7)}"+...`;
        case 'boolean':
            return value ? 'true' : 'false';
        case 'undefined':
            return 'undefined';
        case 'object':
            if (value === null) {
                return 'null';
            }
            if (Array.isArray(value)) {
                return formatArray(value, availableLen);
            }
            return formatObject(value, availableLen);
        case 'symbol':
            return value.toString();
        case 'function':
            return `[[Function${value.name ? ' ' + value.name : ''}]]`;
        default:
            return '' + value;
    }
}
function formatArray(value, availableLen) {
    let result = '[ ';
    let first = true;
    for (const val of value) {
        if (!first) {
            result += ', ';
        }
        if (result.length - 5 > availableLen) {
            result += '...';
            break;
        }
        first = false;
        result += `${formatValue(val, availableLen - result.length)}`;
    }
    result += ' ]';
    return result;
}
function formatObject(value, availableLen) {
    let result = '{ ';
    let first = true;
    for (const [key, val] of Object.entries(value)) {
        if (!first) {
            result += ', ';
        }
        if (result.length - 5 > availableLen) {
            result += '...';
            break;
        }
        first = false;
        result += `${key}: ${formatValue(val, availableLen - result.length)}`;
    }
    result += ' }';
    return result;
}
function repeat(str, count) {
    let result = '';
    for (let i = 1; i <= count; i++) {
        result += str;
    }
    return result;
}
function padStr(str, length) {
    while (str.length < length) {
        str += ' ';
    }
    return str;
}


}),
2892: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ObservablePromise: () => (ObservablePromise),
  PromiseResult: () => (PromiseResult),
  waitForState: () => (waitForState)
});
/* ESM import */var _autorun_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2890);
/* ESM import */var _base_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2885);
/* ESM import */var _errors_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2653);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/



/**
 * A promise whose state is observable.
 */
class ObservablePromise {
    static fromFn(fn) {
        return new ObservablePromise(fn());
    }
    constructor(promise) {
        this._value = (0,_base_js__WEBPACK_IMPORTED_MODULE_1__.observableValue)(this, undefined);
        /**
         * The current state of the promise.
         * Is `undefined` if the promise didn't resolve yet.
         */
        this.promiseResult = this._value;
        this.promise = promise.then(value => {
            (0,_base_js__WEBPACK_IMPORTED_MODULE_1__.transaction)(tx => {
                /** @description onPromiseResolved */
                this._value.set(new PromiseResult(value, undefined), tx);
            });
            return value;
        }, error => {
            (0,_base_js__WEBPACK_IMPORTED_MODULE_1__.transaction)(tx => {
                /** @description onPromiseRejected */
                this._value.set(new PromiseResult(undefined, error), tx);
            });
            throw error;
        });
    }
}
class PromiseResult {
    constructor(
    /**
     * The value of the resolved promise.
     * Undefined if the promise rejected.
     */
    data, 
    /**
     * The error in case of a rejected promise.
     * Undefined if the promise resolved.
     */
    error) {
        this.data = data;
        this.error = error;
    }
}
function waitForState(observable, predicate, isError, cancellationToken) {
    if (!predicate) {
        predicate = state => state !== null && state !== undefined;
    }
    return new Promise((resolve, reject) => {
        let isImmediateRun = true;
        let shouldDispose = false;
        const stateObs = observable.map(state => {
            /** @description waitForState.state */
            return {
                isFinished: predicate(state),
                error: isError ? isError(state) : false,
                state
            };
        });
        const d = (0,_autorun_js__WEBPACK_IMPORTED_MODULE_0__.autorun)(reader => {
            /** @description waitForState */
            const { isFinished, error, state } = stateObs.read(reader);
            if (isFinished || error) {
                if (isImmediateRun) {
                    // The variable `d` is not initialized yet
                    shouldDispose = true;
                }
                else {
                    d.dispose();
                }
                if (error) {
                    reject(error === true ? state : error);
                }
                else {
                    resolve(state);
                }
            }
        });
        if (cancellationToken) {
            const dc = cancellationToken.onCancellationRequested(() => {
                d.dispose();
                dc.dispose();
                reject(new _errors_js__WEBPACK_IMPORTED_MODULE_2__.CancellationError());
            });
            if (cancellationToken.isCancellationRequested) {
                d.dispose();
                dc.dispose();
                reject(new _errors_js__WEBPACK_IMPORTED_MODULE_2__.CancellationError());
                return;
            }
        }
        isImmediateRun = false;
        if (shouldDispose) {
            d.dispose();
        }
    });
}


}),
2891: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  FromEventObservable: () => (FromEventObservable),
  KeepAliveObserver: () => (KeepAliveObserver),
  ValueWithChangeEventFromObservable: () => (ValueWithChangeEventFromObservable),
  constObservable: () => (constObservable),
  derivedConstOnceDefined: () => (derivedConstOnceDefined),
  derivedObservableWithCache: () => (derivedObservableWithCache),
  derivedObservableWithWritableCache: () => (derivedObservableWithWritableCache),
  keepObserved: () => (keepObserved),
  mapObservableArrayCached: () => (mapObservableArrayCached),
  observableFromEvent: () => (observableFromEvent),
  observableFromEventOpts: () => (observableFromEventOpts),
  observableFromValueWithChangeEvent: () => (observableFromValueWithChangeEvent),
  observableSignal: () => (observableSignal),
  observableSignalFromEvent: () => (observableSignalFromEvent),
  recomputeInitiallyAndOnChange: () => (recomputeInitiallyAndOnChange)
});
/* ESM import */var _event_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2652);
/* ESM import */var _lifecycle_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2655);
/* ESM import */var _base_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2885);
/* ESM import */var _debugName_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2887);
/* ESM import */var _derived_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2889);
/* ESM import */var _logging_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(2888);
/* ESM import */var _equals_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(2886);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/







/**
 * Represents an efficient observable whose value never changes.
 */
function constObservable(value) {
    return new ConstObservable(value);
}
class ConstObservable extends _base_js__WEBPACK_IMPORTED_MODULE_2__.ConvenientObservable {
    constructor(value) {
        super();
        this.value = value;
    }
    get debugName() {
        return this.toString();
    }
    get() {
        return this.value;
    }
    addObserver(observer) {
        // NO OP
    }
    removeObserver(observer) {
        // NO OP
    }
    toString() {
        return `Const: ${this.value}`;
    }
}
function observableFromEvent(...args) {
    let owner;
    let event;
    let getValue;
    if (args.length === 3) {
        [owner, event, getValue] = args;
    }
    else {
        [event, getValue] = args;
    }
    return new FromEventObservable(new _debugName_js__WEBPACK_IMPORTED_MODULE_3__.DebugNameData(owner, undefined, getValue), event, getValue, () => FromEventObservable.globalTransaction, _equals_js__WEBPACK_IMPORTED_MODULE_6__.strictEquals);
}
function observableFromEventOpts(options, event, getValue) {
    return new FromEventObservable(new _debugName_js__WEBPACK_IMPORTED_MODULE_3__.DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? getValue), event, getValue, () => FromEventObservable.globalTransaction, options.equalsFn ?? _equals_js__WEBPACK_IMPORTED_MODULE_6__.strictEquals);
}
class FromEventObservable extends _base_js__WEBPACK_IMPORTED_MODULE_2__.BaseObservable {
    constructor(_debugNameData, event, _getValue, _getTransaction, _equalityComparator) {
        super();
        this._debugNameData = _debugNameData;
        this.event = event;
        this._getValue = _getValue;
        this._getTransaction = _getTransaction;
        this._equalityComparator = _equalityComparator;
        this.hasValue = false;
        this.handleEvent = (args) => {
            const newValue = this._getValue(args);
            const oldValue = this.value;
            const didChange = !this.hasValue || !(this._equalityComparator(oldValue, newValue));
            let didRunTransaction = false;
            if (didChange) {
                this.value = newValue;
                if (this.hasValue) {
                    didRunTransaction = true;
                    (0,_base_js__WEBPACK_IMPORTED_MODULE_2__.subtransaction)(this._getTransaction(), (tx) => {
                        (0,_logging_js__WEBPACK_IMPORTED_MODULE_5__.getLogger)()?.handleFromEventObservableTriggered(this, { oldValue, newValue, change: undefined, didChange, hadValue: this.hasValue });
                        for (const o of this.observers) {
                            tx.updateObserver(o, this);
                            o.handleChange(this, undefined);
                        }
                    }, () => {
                        const name = this.getDebugName();
                        return 'Event fired' + (name ? `: ${name}` : '');
                    });
                }
                this.hasValue = true;
            }
            if (!didRunTransaction) {
                (0,_logging_js__WEBPACK_IMPORTED_MODULE_5__.getLogger)()?.handleFromEventObservableTriggered(this, { oldValue, newValue, change: undefined, didChange, hadValue: this.hasValue });
            }
        };
    }
    getDebugName() {
        return this._debugNameData.getDebugName(this);
    }
    get debugName() {
        const name = this.getDebugName();
        return 'From Event' + (name ? `: ${name}` : '');
    }
    onFirstObserverAdded() {
        this.subscription = this.event(this.handleEvent);
    }
    onLastObserverRemoved() {
        this.subscription.dispose();
        this.subscription = undefined;
        this.hasValue = false;
        this.value = undefined;
    }
    get() {
        if (this.subscription) {
            if (!this.hasValue) {
                this.handleEvent(undefined);
            }
            return this.value;
        }
        else {
            // no cache, as there are no subscribers to keep it updated
            const value = this._getValue(undefined);
            return value;
        }
    }
}
(function (observableFromEvent) {
    observableFromEvent.Observer = FromEventObservable;
    function batchEventsGlobally(tx, fn) {
        let didSet = false;
        if (FromEventObservable.globalTransaction === undefined) {
            FromEventObservable.globalTransaction = tx;
            didSet = true;
        }
        try {
            fn();
        }
        finally {
            if (didSet) {
                FromEventObservable.globalTransaction = undefined;
            }
        }
    }
    observableFromEvent.batchEventsGlobally = batchEventsGlobally;
})(observableFromEvent || (observableFromEvent = {}));
function observableSignalFromEvent(debugName, event) {
    return new FromEventObservableSignal(debugName, event);
}
class FromEventObservableSignal extends _base_js__WEBPACK_IMPORTED_MODULE_2__.BaseObservable {
    constructor(debugName, event) {
        super();
        this.debugName = debugName;
        this.event = event;
        this.handleEvent = () => {
            (0,_base_js__WEBPACK_IMPORTED_MODULE_2__.transaction)((tx) => {
                for (const o of this.observers) {
                    tx.updateObserver(o, this);
                    o.handleChange(this, undefined);
                }
            }, () => this.debugName);
        };
    }
    onFirstObserverAdded() {
        this.subscription = this.event(this.handleEvent);
    }
    onLastObserverRemoved() {
        this.subscription.dispose();
        this.subscription = undefined;
    }
    get() {
        // NO OP
    }
}
function observableSignal(debugNameOrOwner) {
    if (typeof debugNameOrOwner === 'string') {
        return new ObservableSignal(debugNameOrOwner);
    }
    else {
        return new ObservableSignal(undefined, debugNameOrOwner);
    }
}
class ObservableSignal extends _base_js__WEBPACK_IMPORTED_MODULE_2__.BaseObservable {
    get debugName() {
        return new _debugName_js__WEBPACK_IMPORTED_MODULE_3__.DebugNameData(this._owner, this._debugName, undefined).getDebugName(this) ?? 'Observable Signal';
    }
    toString() {
        return this.debugName;
    }
    constructor(_debugName, _owner) {
        super();
        this._debugName = _debugName;
        this._owner = _owner;
    }
    trigger(tx, change) {
        if (!tx) {
            (0,_base_js__WEBPACK_IMPORTED_MODULE_2__.transaction)(tx => {
                this.trigger(tx, change);
            }, () => `Trigger signal ${this.debugName}`);
            return;
        }
        for (const o of this.observers) {
            tx.updateObserver(o, this);
            o.handleChange(this, change);
        }
    }
    get() {
        // NO OP
    }
}
/**
 * This makes sure the observable is being observed and keeps its cache alive.
 */
function keepObserved(observable) {
    const o = new KeepAliveObserver(false, undefined);
    observable.addObserver(o);
    return (0,_lifecycle_js__WEBPACK_IMPORTED_MODULE_1__.toDisposable)(() => {
        observable.removeObserver(o);
    });
}
(0,_base_js__WEBPACK_IMPORTED_MODULE_2__._setKeepObserved)(keepObserved);
/**
 * This converts the given observable into an autorun.
 */
function recomputeInitiallyAndOnChange(observable, handleValue) {
    const o = new KeepAliveObserver(true, handleValue);
    observable.addObserver(o);
    if (handleValue) {
        handleValue(observable.get());
    }
    else {
        observable.reportChanges();
    }
    return (0,_lifecycle_js__WEBPACK_IMPORTED_MODULE_1__.toDisposable)(() => {
        observable.removeObserver(o);
    });
}
(0,_base_js__WEBPACK_IMPORTED_MODULE_2__._setRecomputeInitiallyAndOnChange)(recomputeInitiallyAndOnChange);
class KeepAliveObserver {
    constructor(_forceRecompute, _handleValue) {
        this._forceRecompute = _forceRecompute;
        this._handleValue = _handleValue;
        this._counter = 0;
    }
    beginUpdate(observable) {
        this._counter++;
    }
    endUpdate(observable) {
        this._counter--;
        if (this._counter === 0 && this._forceRecompute) {
            if (this._handleValue) {
                this._handleValue(observable.get());
            }
            else {
                observable.reportChanges();
            }
        }
    }
    handlePossibleChange(observable) {
        // NO OP
    }
    handleChange(observable, change) {
        // NO OP
    }
}
function derivedObservableWithCache(owner, computeFn) {
    let lastValue = undefined;
    const observable = (0,_derived_js__WEBPACK_IMPORTED_MODULE_4__.derivedOpts)({ owner, debugReferenceFn: computeFn }, reader => {
        lastValue = computeFn(reader, lastValue);
        return lastValue;
    });
    return observable;
}
function derivedObservableWithWritableCache(owner, computeFn) {
    let lastValue = undefined;
    const onChange = observableSignal('derivedObservableWithWritableCache');
    const observable = (0,_derived_js__WEBPACK_IMPORTED_MODULE_4__.derived)(owner, reader => {
        onChange.read(reader);
        lastValue = computeFn(reader, lastValue);
        return lastValue;
    });
    return Object.assign(observable, {
        clearCache: (tx) => {
            lastValue = undefined;
            onChange.trigger(tx);
        },
        setCache: (newValue, tx) => {
            lastValue = newValue;
            onChange.trigger(tx);
        }
    });
}
/**
 * When the items array changes, referential equal items are not mapped again.
 */
function mapObservableArrayCached(owner, items, map, keySelector) {
    let m = new ArrayMap(map, keySelector);
    const self = (0,_derived_js__WEBPACK_IMPORTED_MODULE_4__.derivedOpts)({
        debugReferenceFn: map,
        owner,
        onLastObserverRemoved: () => {
            m.dispose();
            m = new ArrayMap(map);
        }
    }, (reader) => {
        m.setItems(items.read(reader));
        return m.getItems();
    });
    return self;
}
class ArrayMap {
    constructor(_map, _keySelector) {
        this._map = _map;
        this._keySelector = _keySelector;
        this._cache = new Map();
        this._items = [];
    }
    dispose() {
        this._cache.forEach(entry => entry.store.dispose());
        this._cache.clear();
    }
    setItems(items) {
        const newItems = [];
        const itemsToRemove = new Set(this._cache.keys());
        for (const item of items) {
            const key = this._keySelector ? this._keySelector(item) : item;
            let entry = this._cache.get(key);
            if (!entry) {
                const store = new _lifecycle_js__WEBPACK_IMPORTED_MODULE_1__.DisposableStore();
                const out = this._map(item, store);
                entry = { out, store };
                this._cache.set(key, entry);
            }
            else {
                itemsToRemove.delete(key);
            }
            newItems.push(entry.out);
        }
        for (const item of itemsToRemove) {
            const entry = this._cache.get(item);
            entry.store.dispose();
            this._cache.delete(item);
        }
        this._items = newItems;
    }
    getItems() {
        return this._items;
    }
}
class ValueWithChangeEventFromObservable {
    constructor(observable) {
        this.observable = observable;
    }
    get onDidChange() {
        return _event_js__WEBPACK_IMPORTED_MODULE_0__.Event.fromObservableLight(this.observable);
    }
    get value() {
        return this.observable.get();
    }
}
function observableFromValueWithChangeEvent(owner, value) {
    if (value instanceof ValueWithChangeEventFromObservable) {
        return value.observable;
    }
    return observableFromEvent(owner, value.onDidChange, () => value.value);
}
/**
 * Works like a derived.
 * However, if the value is not undefined, it is cached and will not be recomputed anymore.
 * In that case, the derived will unsubscribe from its dependencies.
*/
function derivedConstOnceDefined(owner, fn) {
    return derivedObservableWithCache(owner, (reader, lastValue) => lastValue ?? fn(reader));
}


}),
2881: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  LanguageService: () => (LanguageService)
});
/* ESM import */var _base_common_event_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2652);
/* ESM import */var _base_common_lifecycle_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2655);
/* ESM import */var _languagesRegistry_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2882);
/* ESM import */var _base_common_arrays_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2640);
/* ESM import */var _languages_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2664);
/* ESM import */var _languages_modesRegistry_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(2731);
/* ESM import */var _base_common_observable_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(2884);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/







class LanguageService extends _base_common_lifecycle_js__WEBPACK_IMPORTED_MODULE_1__.Disposable {
    static { this.instanceCount = 0; }
    constructor(warnOnOverwrite = false) {
        super();
        this._onDidRequestBasicLanguageFeatures = this._register(new _base_common_event_js__WEBPACK_IMPORTED_MODULE_0__.Emitter());
        this.onDidRequestBasicLanguageFeatures = this._onDidRequestBasicLanguageFeatures.event;
        this._onDidRequestRichLanguageFeatures = this._register(new _base_common_event_js__WEBPACK_IMPORTED_MODULE_0__.Emitter());
        this.onDidRequestRichLanguageFeatures = this._onDidRequestRichLanguageFeatures.event;
        this._onDidChange = this._register(new _base_common_event_js__WEBPACK_IMPORTED_MODULE_0__.Emitter({ leakWarningThreshold: 200 /* https://github.com/microsoft/vscode/issues/119968 */ }));
        this.onDidChange = this._onDidChange.event;
        this._requestedBasicLanguages = new Set();
        this._requestedRichLanguages = new Set();
        LanguageService.instanceCount++;
        this._registry = this._register(new _languagesRegistry_js__WEBPACK_IMPORTED_MODULE_2__.LanguagesRegistry(true, warnOnOverwrite));
        this.languageIdCodec = this._registry.languageIdCodec;
        this._register(this._registry.onDidChange(() => this._onDidChange.fire()));
    }
    dispose() {
        LanguageService.instanceCount--;
        super.dispose();
    }
    isRegisteredLanguageId(languageId) {
        return this._registry.isRegisteredLanguageId(languageId);
    }
    getLanguageIdByLanguageName(languageName) {
        return this._registry.getLanguageIdByLanguageName(languageName);
    }
    getLanguageIdByMimeType(mimeType) {
        return this._registry.getLanguageIdByMimeType(mimeType);
    }
    guessLanguageIdByFilepathOrFirstLine(resource, firstLine) {
        const languageIds = this._registry.guessLanguageIdByFilepathOrFirstLine(resource, firstLine);
        return (0,_base_common_arrays_js__WEBPACK_IMPORTED_MODULE_3__.firstOrDefault)(languageIds, null);
    }
    createById(languageId) {
        return new LanguageSelection(this.onDidChange, () => {
            return this._createAndGetLanguageIdentifier(languageId);
        });
    }
    createByFilepathOrFirstLine(resource, firstLine) {
        return new LanguageSelection(this.onDidChange, () => {
            const languageId = this.guessLanguageIdByFilepathOrFirstLine(resource, firstLine);
            return this._createAndGetLanguageIdentifier(languageId);
        });
    }
    _createAndGetLanguageIdentifier(languageId) {
        if (!languageId || !this.isRegisteredLanguageId(languageId)) {
            // Fall back to plain text if language is unknown
            languageId = _languages_modesRegistry_js__WEBPACK_IMPORTED_MODULE_5__.PLAINTEXT_LANGUAGE_ID;
        }
        return languageId;
    }
    requestBasicLanguageFeatures(languageId) {
        if (!this._requestedBasicLanguages.has(languageId)) {
            this._requestedBasicLanguages.add(languageId);
            this._onDidRequestBasicLanguageFeatures.fire(languageId);
        }
    }
    requestRichLanguageFeatures(languageId) {
        if (!this._requestedRichLanguages.has(languageId)) {
            this._requestedRichLanguages.add(languageId);
            // Ensure basic features are requested
            this.requestBasicLanguageFeatures(languageId);
            // Ensure tokenizers are created
            _languages_js__WEBPACK_IMPORTED_MODULE_4__.TokenizationRegistry.getOrCreate(languageId);
            this._onDidRequestRichLanguageFeatures.fire(languageId);
        }
    }
}
class LanguageSelection {
    constructor(onDidChangeLanguages, selector) {
        this._value = (0,_base_common_observable_js__WEBPACK_IMPORTED_MODULE_6__.observableFromEvent)(this, onDidChangeLanguages, () => selector());
        this.onDidChange = _base_common_event_js__WEBPACK_IMPORTED_MODULE_0__.Event.fromObservable(this._value);
    }
    get languageId() {
        return this._value.get();
    }
}


}),

}]);
//# sourceMappingURL=27.js.map