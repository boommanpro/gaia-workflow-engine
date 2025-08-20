import { Emitter, Event } from './event';
import { Disposable } from './disposable';

export class DisposableImpl implements Disposable {
  readonly toDispose = new DisposableCollection();

  dispose(): void {
    this.toDispose.dispose();
  }

  get disposed(): boolean {
    return this.toDispose.disposed;
  }

  get onDispose(): Event<void> {
    return this.toDispose.onDispose;
  }
}

export class DisposableCollection implements Disposable {
  protected readonly disposables: Disposable[] = [];

  protected readonly onDisposeEmitter = new Emitter<void>();

  private _disposed = false;

  constructor(...toDispose: Disposable[]) {
    toDispose.forEach((d) => this.push(d));
  }

  get length() {
    return this.disposables.length;
  }

  get onDispose(): Event<void> {
    return this.onDisposeEmitter.event;
  }

  get disposed(): boolean {
    return this._disposed;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this._disposed = true;
    this.disposables
      .slice()
      .reverse()
      .forEach((disposable) => {
        try {
          disposable.dispose();
        } catch (e) {
          console.error(e);
        }
      });
    this.onDisposeEmitter.fire(undefined);
    this.onDisposeEmitter.dispose();
  }

  push(disposable: Disposable): Disposable {
    if (this.disposed) return Disposable.NULL;
    if (disposable === Disposable.NULL) {
      return Disposable.NULL;
    }
    const { disposables } = this;
    if (disposables.find((d) => d === disposable)) {
      return Disposable.NULL;
    }
    const originalDispose = disposable.dispose;
    const toRemove = Disposable.create(() => {
      const index = disposables.indexOf(disposable);
      if (index !== -1) {
        disposables.splice(index, 1);
      }
      disposable.dispose = originalDispose;
    });
    disposable.dispose = () => {
      toRemove.dispose();
      disposable.dispose();
    };
    disposables.push(disposable);
    return toRemove;
  }

  pushAll(disposables: Disposable[]): Disposable[] {
    return disposables.map((disposable) => this.push(disposable));
  }
}
