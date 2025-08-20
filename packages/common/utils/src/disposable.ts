/**
 * An object that performs a cleanup operation when `.dispose()` is called.
 *
 * Some examples of how disposables are used:
 *
 * - An event listener that removes itself when `.dispose()` is called.
 * - The return value from registering a provider. When `.dispose()` is called, the provider is unregistered.
 */
export interface Disposable {
  dispose(): void;
}

export namespace Disposable {
  export function is(thing: any): thing is Disposable {
    return (
      typeof thing === 'object' &&
      thing !== null &&
      typeof (<Disposable>(<any>thing)).dispose === 'function'
    );
  }

  export function create(func: () => void): Disposable {
    return {
      dispose: func,
    };
  }

  export const NULL = Object.freeze(create(() => {}));
}
