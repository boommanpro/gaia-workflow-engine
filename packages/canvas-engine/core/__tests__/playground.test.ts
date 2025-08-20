/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Rectangle } from '@flowgram.ai/utils';

import { createPlayground } from '../__mocks__/playground-container.mock';
import { createEntity } from '../__mocks__/create-entity.mock';

describe('playground', () => {
  it('should render playground-layer', () => {
    const playground = createPlayground();
    expect(playground?.pipelineNode.innerHTML).toMatchSnapshot();
  });

  it('should playground-layer config normal', () => {
    const playground = createPlayground();
    const scrollLimitCallback = vi.fn(() => ({
      scrollX: 200,
      scrollY: 200,
    }));
    const playgroundConfig = playground.config;
    playgroundConfig.addScrollLimit(scrollLimitCallback);
    playgroundConfig.updateConfig({
      originX: 0,
      originY: 0,
      scrollLimitX: 200,
      scrollLimitY: 200,
      overflowX: 'hidden',
      overflowY: 'hidden',
      zoom: 1,
    });
    playgroundConfig.updateConfig({
      scrollX: -100,
      scrollY: -100,
      scrollLimitX: 200,
      scrollLimitY: 200,
      overflowX: 'hidden',
      overflowY: 'hidden',
      zoom: 2.5,
    });
    playgroundConfig.updateCursor('pointer');
    expect(
      playgroundConfig.getPosFromMouseEvent({
        clientX: 200,
        clientY: 200,
      })
    ).toMatchSnapshot();
    expect(
      playgroundConfig.getPosFromMouseEvent(
        {
          clientX: 200,
          clientY: 200,
        },
        false
      )
    ).toMatchSnapshot();
    expect(
      playgroundConfig.toFixedPos({
        x: 200,
        y: 200,
      })
    ).toMatchSnapshot();
    expect(playgroundConfig.getViewport()).toMatchSnapshot();
    expect(playgroundConfig.getViewport(false)).toMatchSnapshot();
    playgroundConfig.readonly = false;
    playgroundConfig.disabled = false;
    expect(playgroundConfig.readonly).toEqual(false);
    expect(playgroundConfig.disabled).toEqual(false);
    playgroundConfig.zoomEnable = false;
    expect(playgroundConfig.zoomEnable).toEqual(false);
    playgroundConfig.loading = true;
    expect(playgroundConfig.loading).toEqual(true);
    playgroundConfig.updateZoom(2.5);
    playgroundConfig.zoomEnable = true;
    playgroundConfig.updateZoom(0.1);
    // 放大
    playgroundConfig.zoomin();
    // 缩小
    playgroundConfig.zoomout();
  });
  it('should scroll normally', () => {
    const playground = createPlayground();
    const playgroundConfig = playground.config;
    const bounds = new Rectangle(50, 50, 200, 200);
    expect(playgroundConfig.isViewportVisible(bounds)).toEqual(false);
    const mockEntity = createEntity();
    playgroundConfig.scrollToView({
      entities: [mockEntity],
    });
    playgroundConfig.scrollToView({
      position: { x: 200, y: 200 },
    });
    playgroundConfig.scrollToView();
    playgroundConfig.scroll({ scrollX: 400 });
    playgroundConfig.scroll({ scrollX: 400 }, false);
    playgroundConfig.fixLayerPosition(playground?.pipelineNode);
    playgroundConfig.setPageBounds(bounds);
    expect(playgroundConfig.getPageBounds()).toEqual(bounds);
    playgroundConfig.scrollPageBoundsToCenter();
  });
  it('should playground all layers rendered', () => {
    // mock E2E 测试环境调用函数
    vi.stubGlobal('REPORT_TTI_FOR_E2E', vi.fn());

    const playground = createPlayground();
    const renderer = playground.pipelineRegistry.renderer;

    // 设置每一个 layer 都渲染完成，mock TTI 上报
    renderer.layers.forEach((layer) => {
      renderer.reportLayerRendered(layer);
    });
    const allLayersRendered = Array.from(renderer.layerRenderedMap.values()).every((v) => v);
    expect(allLayersRendered).toEqual(true);
  });
  it('scrollDisable', () => {
    const playground = createPlayground();
    playground.config.scrollDisable = true;
    playground.config.updateConfig({
      scrollX: 10000,
      scrollY: 10000,
    });
    expect(playground.config.scrollData).toEqual({ scrollX: 0, scrollY: 0 });
    playground.config.scrollDisable = false;
    playground.config.updateConfig({
      scrollX: 10000,
      scrollY: 10000,
    });
    expect(playground.config.scrollData).toEqual({ scrollX: 10000, scrollY: 10000 });
  });
  it('zoomDisable', () => {
    const playground = createPlayground();
    playground.config.zoomDisable = true;
    playground.config.updateConfig({
      zoom: 1.3,
    });
    expect(playground.config.zoom).toEqual(1);
    playground.config.zoomDisable = false;
    playground.config.updateConfig({
      zoom: 1.3,
    });
    expect(playground.config.zoom).toEqual(1.3);
  });
});
