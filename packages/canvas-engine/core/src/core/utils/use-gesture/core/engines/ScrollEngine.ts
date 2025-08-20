/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { V } from '../utils/maths';
import { scrollValues } from '../utils/events';
import { CoordinatesEngine } from './CoordinatesEngine';

export class ScrollEngine extends CoordinatesEngine<'scroll'> {
  ingKey = 'scrolling' as const;

  scroll(event: UIEvent) {
    if (!this.state._active) this.start(event);
    this.scrollChange(event);
    this.timeoutStore.add('scrollEnd', this.scrollEnd.bind(this));
  }

  scrollChange(event: UIEvent) {
    if (event.cancelable) event.preventDefault();
    const state = this.state;
    const values = scrollValues(event);
    state._delta = V.sub(values, state._values);
    V.addTo(state._movement, state._delta);

    this.computeValues(values);
    this.compute(event);

    this.emit();
  }

  scrollEnd() {
    if (!this.state._active) return;
    this.state._active = false;
    this.compute();
    this.emit();
  }

  bind(bindFunction: any) {
    bindFunction('scroll', '', this.scroll.bind(this));
  }
}
