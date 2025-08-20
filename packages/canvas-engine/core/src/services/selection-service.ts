/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';
import { Compare, type Disposable, Emitter, type Event } from '@flowgram.ai/utils';

import { type Entity } from '../common';

/**
 * 画布全局的选择器，可以放任何东西
 */
@injectable()
export class SelectionService implements Disposable {
  protected readonly onSelectionChangedEmitter = new Emitter<Entity[]>();

  readonly onSelectionChanged: Event<any> = this.onSelectionChangedEmitter.event;

  private currentSelection: Entity[] = [];

  private disposers: Disposable[] = [];

  get selection(): Entity[] {
    return this.currentSelection;
  }

  isEmpty(): boolean {
    return this.currentSelection.length === 0;
  }

  set selection(selection: Entity<any>[]) {
    if (!Compare.isArrayShallowChanged(this.currentSelection, selection)) {
      return;
    }
    this.disposers.forEach((disposer) => disposer.dispose());
    this.changeSelection(selection);
    this.disposers = this.currentSelection.map((selection) =>
      selection.onDispose(() => {
        const newSelection = this.currentSelection.filter((n) => n !== selection);
        this.changeSelection(newSelection);
      })
    );
  }

  private changeSelection(selection: Entity<any>[]) {
    this.currentSelection = selection;
    this.onSelectionChangedEmitter.fire(this.currentSelection);
  }

  dispose() {
    this.onSelectionChangedEmitter.dispose();
  }
}
