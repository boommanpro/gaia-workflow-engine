/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';

import { PlaygroundGesture } from './playground-gesture';

vi.mock('@use-gesture/vanilla', () => {
  class Gesture {}
  return {
    Gesture,
  };
});

describe('PlaygroundGesture', () => {
  const el = document.createElement('div');
  const playgroundGesture = new PlaygroundGesture(el, {
    config: {
      minZoom: 0.4,
      maxZoom: 2.2,
      resolution: 1,
    },
  } as any);
  it('getScaleBounds', () => {
    expect(playgroundGesture.getScaleBounds()).toEqual({
      min: 0.4,
      max: 2.2,
    });
  });
  it('pinching', () => {
    expect(playgroundGesture.pinching).toBeFalsy();
  });
});

describe('PlaygroundGesture', () => {
  let el: HTMLElement;
  let config: any;
  let playgroundGesture: PlaygroundGesture;

  beforeEach(() => {
    el = document.createElement('div');
    config = {
      config: {
        minZoom: 0.4,
        maxZoom: 2.2,
        resolution: 1,
        scrollX: 0,
        scrollY: 0,
      },
      finalScale: 1,
      getPosFromMouseEvent: vi.fn().mockReturnValue({ x: 50, y: 50 }),
      updateConfig: vi.fn(),
    };
    playgroundGesture = new PlaygroundGesture(el, config);
  });

  describe('PlaygroundGesture handlePinch', () => {
    it('should not update config when newScale is NaN', () => {
      playgroundGesture.handlePinch({
        first: true,
        last: false,
        originX: 100,
        originY: 100,
        newScale: NaN,
      });

      expect(config.updateConfig).not.toHaveBeenCalled();
    });

    it('should set _pinching to true on first pinch', () => {
      playgroundGesture.handlePinch({
        first: true,
        last: false,
        originX: 100,
        originY: 100,
        newScale: 1.5,
      });

      expect(playgroundGesture.pinching).toBe(true);
    });

    it('should set _pinching to false on last pinch', () => {
      playgroundGesture.handlePinch({
        first: false,
        last: true,
        originX: 100,
        originY: 100,
        newScale: 1.5,
      });

      expect(playgroundGesture.pinching).toBe(false);
    });

    it('should call updateConfig with correct parameters', () => {
      playgroundGesture.handlePinch({
        first: false,
        last: false,
        originX: 100,
        originY: 100,
        newScale: 2,
      });

      expect(config.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          scrollX: expect.any(Number),
          scrollY: expect.any(Number),
          zoom: 2,
        })
      );
    });

    it('should calculate correct scroll values', () => {
      config.getPosFromMouseEvent.mockReturnValue({ x: 100, y: 100 });
      config.finalScale = 1;
      config.config.scrollX = 0;
      config.config.scrollY = 0;

      playgroundGesture.handlePinch({
        first: false,
        last: false,
        originX: 100,
        originY: 100,
        newScale: 2,
      });

      expect(config.updateConfig).toHaveBeenCalledWith({
        scrollX: 100,
        scrollY: 100,
        zoom: 2,
      });
    });
  });
});
