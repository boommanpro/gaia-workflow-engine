import { NOOP } from './objects';
import { Disposable } from './disposable';

export interface EventListener<T> {
  (args: T): void;
}

export interface Event<T> {
  (listener: EventListener<T>, thisArgs?: any): Disposable;
}

export namespace Event {
  export const None: Event<any> = () => Disposable.NULL;
}

export class Emitter<T = any> {
  static LEAK_WARNING_THRESHHOLD = 175;

  private _event?: Event<T>;

  private _listeners?: EventListener<T>[];

  private _disposed = false;

  get event(): Event<T> {
    if (!this._event) {
      this._event = (listener: EventListener<T>, thisArgs?: any) => {
        if (this._disposed) {
          return Disposable.NULL;
        }
        if (!this._listeners) {
          this._listeners = [];
        }
        const finalListener = thisArgs ? listener.bind(thisArgs) : listener;
        if (this._listeners.length >= Emitter.LEAK_WARNING_THRESHHOLD) {
          console.warn(`[Emitter] Listeners length >= ${Emitter.LEAK_WARNING_THRESHHOLD}`);
        }
        this._listeners.push(finalListener);

        const eventDisposable: Disposable = {
          dispose: () => {
            eventDisposable.dispose = NOOP;
            if (!this._disposed) {
              const index = this._listeners!.indexOf(finalListener);
              if (index !== -1) {
                this._listeners!.splice(index, 1);
              }
            }
          },
        };

        return eventDisposable;
      };
    }
    return this._event;
  }

  fire(event: T): void {
    if (this._listeners) {
      this._listeners.forEach((listener) => listener(event));
    }
  }

  get disposed(): boolean {
    return this._disposed;
  }

  dispose(): void {
    if (this._listeners) {
      this._listeners = undefined;
    }
    this._disposed = true;
  }
}
