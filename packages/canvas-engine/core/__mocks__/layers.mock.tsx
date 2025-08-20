/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { domUtils } from '@flowgram.ai/utils';
import { Layer } from '../src/core';
import { Entity, EntityData, observeEntityDatas } from '../src/common';

export class MockEntityDataRegistry extends EntityData {
  getDefaultData() {
    return {};
  }

  static type = 'mock';
}

export class TestUtilsLayer extends Layer {
  node = domUtils.createDivWithClass('test-layer');

  renderWithReactMemo: boolean;

  setRenderWithReactMemo(status: boolean) {
    this.renderWithReactMemo = status;
  }
}

export class _TestEntity extends Entity {
  static type = 'test-entity';
}

export class TestRenderLayer1 extends Layer {
  autorun = () => {};
}

export class TestRenderLayer2 extends Layer {
  node = domUtils.createDivWithClass('test-layer');

  renderWithReactMemo: true;

  render = () => <div></div>;
}

export class TestRenderLayer3 extends Layer {
  // mock entityRegistries、entityDataRegistries
  @observeEntityDatas(_TestEntity, MockEntityDataRegistry) _transforms: any[];

  public resizeTimes = 0;
  public blurTimes = 0;
  public focusTimes = 0;
  public zoomTimes = 0;
  public scrollTimes = 0;
  public fireViewportChanged = false;
  public readonlyOrDisabledChanged = false;

  onResize = () => this.resizeTimes++;
  onBlur = () => this.blurTimes++;
  onFocus = () => this.focusTimes++;
  onZoom = () => this.zoomTimes++;
  onScroll = () => this.scrollTimes++;
  onViewportChange = () => { this.fireViewportChanged = true };
  onReadonlyOrDisabledChange = () => { this.readonlyOrDisabledChanged = true };
}
