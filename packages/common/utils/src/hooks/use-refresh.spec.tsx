/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { render } from '@testing-library/react';

import { useRefresh } from './use-refresh';

it('refresh nested', () => {
  let comp1RenderTimes = 0;
  let comp2RenderTimes = 0;
  const Comp1 = () => {
    comp1RenderTimes++;
    const refresh = useRefresh();
    React.useEffect(() => {
      refresh();
    }, []);
    return <div></div>;
  };
  const Comp2 = () => {
    comp2RenderTimes++;
    const refresh = useRefresh();
    React.useEffect(() => {
      refresh();
    }, []);
    return (
      <div>
        <Comp1 />
      </div>
    );
  };
  render(<Comp2 />);
  expect(comp1RenderTimes).toEqual(2);
  expect(comp2RenderTimes).toEqual(2);
});
