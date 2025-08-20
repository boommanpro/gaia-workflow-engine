/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import * as React from 'react';

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import { useReactiveState, useReadonlyReactiveState, Tracker, ReactiveState } from '../src';

describe('hooks', () => {
  afterEach(() => cleanup());
  it('useReactiveState update more times', () => {
    let renderTimes = 0;
    const Comp = () => {
      renderTimes++;
      const value = useReactiveState({ a: 0, b: 0 });
      React.useEffect(() => {
        value.a = 1;
        value.a = 2;
        value.b = 1;
        value.b = 2;
      }, []);
      return (
        <div>
          {value.a} - {value.b}
        </div>
      );
    };
    const result = render(<Comp />);
    Tracker.flush();
    expect(renderTimes).toEqual(2); // batch update
    expect(result.asFragment().textContent).toEqual('2 - 2');
  });
  it('useReactiveState sub component', () => {
    let comp1RenderTimes = 0;
    let comp2RenderTimes = 0;
    const Comp1 = ({ value }: any) => {
      comp1RenderTimes++;
      React.useEffect(() => {
        value.a = 2;
      }, []);
      return <div>{value.a}</div>;
    };
    const Comp2 = () => {
      comp2RenderTimes++;
      const value = useReactiveState({ a: 0 });
      return <Comp1 value={value} />;
    };
    const result = render(<Comp2 />);
    function checkTimes(a: number, b: number) {
      expect(comp1RenderTimes).toEqual(a);
      expect(comp2RenderTimes).toEqual(b);
    }
    checkTimes(1, 1);
    Tracker.flush();
    checkTimes(2, 2);
    expect(result.asFragment().textContent).toEqual('2');
  });
  it('useReactiveState from outside', () => {
    let comp1RenderTimes = 0;
    let comp2RenderTimes = 0;
    const state = new ReactiveState({ a: 0, b: 0 });
    const Comp1 = ({ value }: any) => {
      comp1RenderTimes++;
      return <div>{comp1RenderTimes >= 3 ? '-' : value.a}</div>;
    };
    const Comp2 = () => {
      comp2RenderTimes++;
      const value = useReactiveState(state);
      return <Comp1 value={value} />;
    };
    const result = render(<Comp2 />);
    function checkTimes(a: number, b: number) {
      expect(comp1RenderTimes).toEqual(a);
      expect(comp2RenderTimes).toEqual(b);
    }
    checkTimes(1, 1);
    state.value.b = 1;
    Tracker.flush();
    checkTimes(1, 1); // b 没有依赖所有不更新
    state.value.a = 1;
    Tracker.flush();
    checkTimes(2, 2);
    state.value.a = 2;
    Tracker.flush();
    checkTimes(3, 3);
    expect(result.asFragment().textContent).toEqual('-');
    state.value.a = 3;
    Tracker.flush();
    checkTimes(3, 3); // a 不再依赖所以不更新
  });
  it('useReactiveState nested', () => {
    const state = new ReactiveState({ a: 0 });
    let comp1RenderTimes = 0;
    let comp2RenderTimes = 0;
    const Comp1 = () => {
      comp1RenderTimes++;
      const value = useReactiveState(state);
      React.useEffect(() => {
        value.a = 1;
      }, []);
      return <div>{value.a}</div>;
    };
    const Comp2 = () => {
      comp2RenderTimes++;
      const value = useReactiveState(state);
      React.useEffect(() => {
        value.a = 2;
      }, []);
      return (
        <div>
          <Comp1 /> - {value.a}
        </div>
      );
    };
    function checkTimes(a: number, b: number) {
      expect(comp1RenderTimes).toEqual(a);
      expect(comp2RenderTimes).toEqual(b);
    }
    const result = render(<Comp2 />);
    Tracker.flush();
    checkTimes(2, 2);
    expect(result.asFragment().textContent).toEqual('2 - 2');
  });
  it('useReadonlyReactiveState', () => {
    const state = new ReactiveState({ a: 0 });
    const Comp = () => {
      const v = useReadonlyReactiveState(state);
      expect(() => {
        (v as any).a = 3;
      }).toThrowError(/readonly/);
      return <div>{v.a}</div>;
    };
    render(<Comp />);
  });
});
