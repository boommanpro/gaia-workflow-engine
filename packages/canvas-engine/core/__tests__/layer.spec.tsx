/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { interfaces } from 'inversify';
import { render } from '@testing-library/react';

import {
  EditorState,
  PlaygroundLayer,
  PlaygroundReactProvider,
  PlaygroundReactRenderer,
} from '../src';
import { createPlayground } from '../__mocks__/playground-container.mock';
import { TestUtilsLayer } from '../__mocks__/layers.mock';

describe('Layer', () => {
  beforeAll(() => {
    const modules: interfaces.ContainerModule[] = [];
    // 渲染 playground
    render(
      <PlaygroundReactProvider containerModules={modules}>
        <PlaygroundReactRenderer>
          <div></div>
        </PlaygroundReactRenderer>
      </PlaygroundReactProvider>,
    );
  });

  test('layer', () => {
    const playground = createPlayground();
    playground.registerLayer(TestUtilsLayer);
    const testLayer = playground.getLayer(TestUtilsLayer)!;
    const cache = testLayer.createDOMCache('cache', 'mock children');
    // 成功创建 cache
    expect(cache.get()).not.toBeNull();
    testLayer.node = null as any;
    // mock 错误 case
    expect(() => testLayer.createDOMCache('cache')).toThrowError(
      new Error('DomCache need a parent dom node.'),
    );

    // 获取鼠标位置方法
    const pos = testLayer.getPosFromMouseEvent({ clientX: 0, clientY: 0 });
    expect(pos).toEqual({
      x: 0,
      y: 0,
    });
    const pos2 = testLayer.getPosFromMouseEvent({ clientX: 0, clientY: 0 }, false);
    expect(pos2).toEqual({
      x: 0,
      y: 0,
    });
  });

  test('playground-layer', () => {
    const playground = createPlayground();
    playground.registerLayer(PlaygroundLayer);
    const playgroundLayer = playground.getLayer(PlaygroundLayer);
    const registry = playground.pipelineRegistry;
    if (playgroundLayer) {
      playgroundLayer.options.preventGlobalGesture = true;
    }
    playground.ready();
    let testEventCount = 0;
    registry.listenGlobalEvent('test-event', () => {
      testEventCount++;
      return undefined;
    });
    // 调用方法
    document.dispatchEvent(new Event('test-event'));
    expect(testEventCount).toEqual(1);

    document.dispatchEvent(new Event('keypress'));
    document.dispatchEvent(new Event('keyup'));

    registry.renderer.node.parentNode!.dispatchEvent(new Event('wheel'));

    // 切换到 grab 模式
    // @ts-ignore
    const editorStateConfig = playgroundLayer?.editorStateConfig;
    editorStateConfig?.changeState(EditorState.STATE_GRAB.id, new MouseEvent('mousedown') as any);
    registry.renderer.node.parentNode!.dispatchEvent(new Event('mousedown'));
    // 注册条件 state, mode = esc
    editorStateConfig?.registerState({
      id: 'TEST_STATE',
      cancelMode: 'esc',
      handle: () => null,
    });
    document.dispatchEvent(new Event('keydown'));
    editorStateConfig?.changeState('TEST_STATE', new MouseEvent('mousedown') as any);
    // // 注册条件，mode = once
    // editorStateConfig?.changeState(
    //   EditorState.STATE_ZOOM_CENTER.id,
    //   new MouseEvent('mousedown') as any,
    // );

    // @ts-ignore
    editorStateConfig?.onCancel(EditorState.STATE_GRAB.id, () => {});
    // editorStateConfig?.onCancel(EditorState.STATE_ZOOM_CENTER.id, () => {});
    editorStateConfig?.onCancel('TEST_STATE', () => {});
    // 触发 autorun
    playgroundLayer?.createGesture();

    // 注销 layer
    playgroundLayer?.dispose();
  });
});
