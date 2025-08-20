/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import * as React from 'react';

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import { observe, Tracker, ReactiveBaseState } from '../src';

function nextTick(v = 0): Promise<void> {
  return new Promise(res => setTimeout(res, v));
}
function createComp(name: string): {
  Comp: any;
  renderTimes: number;
  name: string;
  fireRender: () => void;
} {
  let renderTimes = 0;
  let state = new ReactiveBaseState(0);
  // let refresh: any;
  const Comp = observe((props: any) => {
    // refresh = useRefresh()
    renderTimes++;
    return (
      <span>
        {state.value}
        {typeof props.children === 'function' ? props.children() : props.children}
      </span>
    );
  });
  return {
    Comp,
    name,
    get renderTimes(): number {
      return renderTimes;
    },
    fireRender(): void {
      state.value += 1;
      // refresh()
    },
  };
}

describe('observe', () => {
  afterEach(() => cleanup());
  it('base', async () => {
    const comp = createComp('comp1');
    const result = render(<comp.Comp />);
    expect(comp.renderTimes).toEqual(1);
    expect(result.asFragment().textContent).toEqual('0');
    comp.fireRender();
    Tracker.flush();
    expect(comp.renderTimes).toEqual(2);
    expect(result.asFragment().textContent).toEqual('1');
    comp.fireRender();
    Tracker.flush();
    expect(comp.renderTimes).toEqual(3);
    expect(result.asFragment().textContent).toEqual('2');
    comp.fireRender();
    // use next tick to wait update
    await nextTick();
    expect(comp.renderTimes).toEqual(4);
    expect(result.asFragment().textContent).toEqual('3');
  });
  it('render nested', () => {
    const comp1 = createComp('comp1');
    const comp2 = createComp('comp2');
    const checkTimes = (v1: number, v2: number) => {
      // console.log(comp1.renderTimes, comp2.renderTimes)
      expect(comp1.renderTimes).toEqual(v1);
      expect(comp2.renderTimes).toEqual(v2);
    };
    render(
      <comp1.Comp>
        <comp2.Comp />
      </comp1.Comp>,
    );
    checkTimes(1, 1);
    comp1.fireRender();
    Tracker.flush();
    checkTimes(2, 1);
    comp2.fireRender();
    Tracker.flush();
    checkTimes(2, 2);
    comp1.fireRender();
    comp2.fireRender();
    Tracker.flush();
    checkTimes(3, 3);
  });
  it('render nested with renderProps', () => {
    const comp1 = createComp('comp1');
    const comp2 = createComp('comp2');
    const checkTimes = (v1: number, v2: number) => {
      // console.log(comp1.renderTimes, comp2.renderTimes)
      expect(comp1.renderTimes).toEqual(v1);
      expect(comp2.renderTimes).toEqual(v2);
    };
    render(<comp1.Comp>{() => <comp2.Comp />}</comp1.Comp>);
    checkTimes(1, 1);
    comp1.fireRender();
    Tracker.flush();
    checkTimes(2, 2);
    comp2.fireRender();
    Tracker.flush();
    checkTimes(2, 3);
    comp1.fireRender();
    comp2.fireRender();
    Tracker.flush();
    checkTimes(3, 4);
  });
});
