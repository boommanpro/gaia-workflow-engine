/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useRef, useEffect } from 'react';

import { expect } from 'vitest';
import { render } from '@testing-library/react';

import { PluginContext, PlaygroundReactProvider, PlaygroundReactRenderer } from '../src';

describe('PlaygroundReact', () => {
  test('ref', () => {
    function PlaygroundDemo() {
      const ref = useRef<PluginContext>();
      useEffect(() => {
        expect(ref.current!.playground).toBeDefined();
      }, []);
      return (
        <PlaygroundReactProvider ref={ref}>
          <PlaygroundReactRenderer>
            <div></div>
          </PlaygroundReactRenderer>
        </PlaygroundReactProvider>
      );
    }
    render(<PlaygroundDemo />);
  });
});
