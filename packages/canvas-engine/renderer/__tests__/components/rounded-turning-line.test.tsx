/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import * as React from 'react';

import { describe, test, expect, vi } from 'vitest';
import { Container, interfaces } from 'inversify';
import { render } from '@testing-library/react';
import {
  FlowDocumentContainerModule,
  FlowTransitionLine,
  FlowTransitionLineEnum,
} from '@flowgram.ai/document';

import RoundedTurningLine from '../../src/components/RoundedTurningLine';

function createDocumentContainer(): interfaces.Container {
  const container = new Container();
  container.load(FlowDocumentContainerModule);
  // container.bind(FlowDocumentContribution).to(FlowDocumentMockRegister);
  return container;
}

vi.mock('../../src/hooks/use-base-color.ts', () => ({
  useBaseColor: () => ({
    baseActivatedColor: '#fff',
    baseColor: '#fff',
  }),
  BASE_DEFAULT_COLOR: '#BBBFC4',
  BASE_DEFAULT_ACTIVATED_COLOR: '#82A7FC',
}));

describe('RoundedTurningLine', () => {
  test('should render RoundedTurningLine correctly', () => {
    const line: FlowTransitionLine = {
      type: FlowTransitionLineEnum.ROUNDED_LINE,
      from: {
        x: 0,
        y: 0,
      },
      to: {
        x: 100,
        y: 100,
      },
      vertices: [
        {
          x: 100,
          y: 0,
        },
      ],
    };

    const { container } = render(<RoundedTurningLine {...line} />);
    expect(container.querySelector('path')).toBeDefined();
  });

  test('should render RoundedTurningLine horizontal & arrow & active', () => {
    const line: FlowTransitionLine = {
      type: FlowTransitionLineEnum.ROUNDED_LINE,
      from: {
        x: 0,
        y: 0,
      },
      to: {
        x: 100,
        y: 100,
      },
      activated: true,
    };

    const { container } = render(<RoundedTurningLine arrow={true} isHorizantal={true} {...line} />);
    expect(container.querySelector('path')).toBeDefined();
  });

  test('should render with vertices', () => {
    const line: FlowTransitionLine = {
      type: FlowTransitionLineEnum.ROUNDED_LINE,
      from: {
        x: 0,
        y: 0,
      },
      to: {
        x: 100,
        y: 100,
      },
      vertices: [
        {
          x: 0,
          y: 30,
        },
        {
          x: 0,
          y: 30,
          radiusX: 30,
          radiusY: 30,
        },
        {
          x: 0,
          y: 30,
          moveX: 10,
          moveY: 10,
        },
        {
          x: 50,
          y: 50,
        },
      ],
      activated: true,
    };

    const { container } = render(<RoundedTurningLine arrow={true} isHorizantal={true} {...line} />);
    expect(container.querySelector('path')).toBeDefined();
  });

  test('should hide RoundedTurningLine', () => {
    const line: FlowTransitionLine = {
      type: FlowTransitionLineEnum.ROUNDED_LINE,
      from: {
        x: 0,
        y: 0,
      },
      to: {
        x: 100,
        y: 100,
      },
    };

    const { container } = render(<RoundedTurningLine hide={true} {...line} />);
    expect(container.querySelector('path')).toBeNull();
  });
});
