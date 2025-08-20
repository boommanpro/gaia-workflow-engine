/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { interfaces } from 'inversify';
import { renderHook } from '@testing-library/react-hooks';
import { render, screen, fireEvent, createEvent } from '@testing-library/react';
import { delay } from '@flowgram.ai/utils';
import { FlowNodeRenderData } from '@flowgram.ai/document';
import { PositionData } from '@flowgram.ai/core';

import { createDocument, createHookWrapper } from '../mocks';
import {
  useNodeRender,
  WorkflowDocument,
  WorkflowNodeEntity,
  WorkflowSelectService,
} from '../../src';

const Button = ({ onClick, children }: any) => <button onClick={onClick}>{children}</button>;

describe('use-node-render', () => {
  let container: interfaces.Container;
  let doc: WorkflowDocument;
  let wrapper: any;
  let node: WorkflowNodeEntity;
  let domNode: HTMLDivElement;
  beforeEach(async () => {
    container = (await createDocument()).container;
    doc = container.get(WorkflowDocument)!;
    node = doc.getNode('start_0')!;
    domNode = node.getData(FlowNodeRenderData).node!;
    wrapper = createHookWrapper(container);
  });
  it('select node and listen change', async () => {
    // 初始化
    const { result } = renderHook(() => useNodeRender(), {
      wrapper,
    });
    expect(result.current.selected).toEqual(false);
    expect(result.current.activated).toEqual(false);
    // 选中
    result.current.selectNode(createEvent('click', domNode) as any);
    const { result: result2 } = renderHook(() => useNodeRender(), {
      wrapper,
    });
    expect(result2.current.selected).toEqual(true);
    expect(result2.current.activated).toEqual(true);
    // 清除选中
    container.get<WorkflowSelectService>(WorkflowSelectService).clear();
    const { result: result3 } = renderHook(() => useNodeRender(), {
      wrapper,
    });
    expect(result3.current.selected).toEqual(false);
    expect(result3.current.activated).toEqual(false);
  });
  it('toggle select', async () => {
    const { result } = renderHook(() => useNodeRender(), {
      wrapper,
    });
    result.current.selectNode(new MouseEvent('click', { shiftKey: true }) as any);
    const { result: result2 } = renderHook(() => useNodeRender(), {
      wrapper,
    });
    expect(result2.current.selected).toEqual(true);
    result.current.selectNode(new MouseEvent('click', { shiftKey: true }) as any);
    const { result: result3 } = renderHook(() => useNodeRender(), {
      wrapper,
    });
    expect(result3.current.selected).toEqual(false);
  });
  it('delete node', async () => {
    const wrapper = createHookWrapper(container);
    const { result } = renderHook(() => useNodeRender(), {
      wrapper,
    });
    result.current.deleteNode();
    expect(node.disposed).toEqual(true);
  });
  it('start drag', async () => {
    const wrapper = createHookWrapper(container);
    const { result } = renderHook(() => useNodeRender(), {
      wrapper,
    });
    render(<Button onClick={result.current.startDrag}>Click Me</Button>);
    // start Drag
    fireEvent.click(screen.getByText(/click me/i));
    // start mousemove
    fireEvent(
      document,
      new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      })
    );
    const { result: result2 } = renderHook(() => useNodeRender(), {
      wrapper,
    });
    expect(result2.current.selected).toEqual(true);
    expect(node.getData(PositionData).toJSON()).toEqual({ x: 100, y: 100 });
    result.current.selectNode(new MouseEvent('click', { shiftKey: true }) as any);
    const { result: result3 } = renderHook(() => useNodeRender(), {
      wrapper,
    });
    // 拖拽时候无法再次触发选中事件
    expect(result3.current.selected).toEqual(true);
    fireEvent(
      document,
      new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      })
    );
    await delay(10);
    // 拖拽结束可以取消选中
    result.current.selectNode(new MouseEvent('click', { shiftKey: true }) as any);
    expect(result.current.selected).toEqual(false);
  });
  it('start drag input', async () => {
    const wrapper = createHookWrapper(container);
    const { result } = renderHook(() => useNodeRender(), {
      wrapper,
    });
    render(<input role="input" onClick={result.current.startDrag} />);
    // start Drag
    fireEvent.click(screen.getByRole('input'));
    const { result: result2 } = renderHook(() => useNodeRender(), {
      wrapper,
    });
    expect(result2.current.selected).toEqual(true);
    fireEvent(
      document,
      new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      })
    );
    // input 无法拖拽
    expect(node.getData(PositionData).toJSON()).toEqual({ x: 0, y: 0 });
  });
});
