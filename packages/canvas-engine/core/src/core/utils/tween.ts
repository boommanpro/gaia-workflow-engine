/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import TWEEN from '@tweenjs/tween.js';
import { Disposable } from '@flowgram.ai/utils';

let started = 0;

// Setup the animation loop.
function startTweenLoop(): void {
  started++;
  function animate(time: number): void {
    if (started <= 0) return;
    requestAnimationFrame(animate);
    TWEEN.update(time);
  }
  requestAnimationFrame(animate);
}

function stopTweenLoop(): void {
  started--;
}

interface TweenValues {
  [key: string]: number;
}

export interface TweenOpts<V> {
  from: V;
  to: V;
  onUpdate?: (v: V) => void;
  onComplete?: (v: V) => void;
  onDispose?: (v: V) => void;
  easing?: (num: number) => number;
  duration: number;
}

export function startTween<V extends TweenValues = TweenValues>(opts: TweenOpts<V>): Disposable {
  startTweenLoop();
  let stopped = false;
  const tween = new TWEEN.Tween(opts.from)
    .to(opts.to, opts.duration)
    .easing(opts.easing || TWEEN.Easing.Quadratic.Out)
    .onUpdate(() => {
      if (stopped) return;
      if (opts.onUpdate) opts.onUpdate(opts.from);
    })
    .onComplete(() => {
      if (stopped) return;
      stopped = true;
      stopTweenLoop();
      if (opts.onComplete) opts.onComplete(opts.from);
    })
    .start();
  return Disposable.create(() => {
    if (stopped) return;
    stopped = true;
    stopTweenLoop();
    tween.stop();
    if (opts.onDispose) opts.onDispose(opts.from);
  });
}

export interface ScrollIntoViewOpts {
  getScrollParent(): HTMLElement | undefined;

  getTargetNode(): HTMLElement | undefined;

  duration?: number;
  scrollY?: boolean; // 默认 true
  scrollX?: boolean; // 默认 true
}

const defaultScrollIntoViewOpts = {
  duration: 300,
  scrollY: true,
  scrollX: true,
};

const preTweenMap = new WeakMap<HTMLElement, Disposable>();

/**
 * 滚动到可视区域
 * @param opts
 */
export function scrollIntoViewWithTween(opts: ScrollIntoViewOpts): Disposable {
  opts = { ...defaultScrollIntoViewOpts, ...opts };
  const parentNode = opts.getScrollParent();
  const targetNode = opts.getTargetNode();
  if (!parentNode || !targetNode) return Disposable.NULL;
  // 销毁上一次的
  if (preTweenMap.has(parentNode)) {
    preTweenMap.get(parentNode)!.dispose();
  }
  const startScrollTop = parentNode.scrollTop;
  const startScrollLeft = parentNode.scrollLeft;
  let endScrollTop = startScrollTop;
  let endScrollLeft = startScrollLeft;
  const parentBound = parentNode.getBoundingClientRect();
  const targetBound = targetNode.getBoundingClientRect();
  const top = targetBound.top - parentBound.top + startScrollTop;
  const left = targetBound.left - parentBound.left + startScrollLeft;
  if (startScrollTop > top) {
    endScrollTop = top;
  } else {
    const bottom = top + targetNode.clientHeight - parentNode.clientHeight;
    if (startScrollTop < bottom && targetNode.clientHeight < parentNode.clientHeight) {
      endScrollTop = bottom;
    }
  }
  if (startScrollLeft > left) {
    endScrollLeft = left;
  } else {
    const right = left + targetNode.clientWidth - parentNode.clientWidth;
    if (startScrollLeft < right && targetNode.clientWidth < parentNode.clientWidth) {
      endScrollLeft = right;
    }
  }
  if (startScrollTop !== endScrollTop || startScrollLeft !== endScrollLeft) {
    const from: { scrollTop?: number; scrollLeft?: number } = {};
    const to: { scrollTop?: number; scrollLeft?: number } = {};
    if (opts.scrollY) {
      from.scrollTop = startScrollTop;
      to.scrollTop = endScrollTop;
    }
    if (opts.scrollX) {
      from.scrollLeft = startScrollLeft;
      to.scrollLeft = endScrollLeft;
    }
    const scrollTween = startTween<{ scrollTop?: number; scrollLeft?: number }>({
      from,
      to,
      onUpdate: v => {
        if (v.scrollTop !== undefined) {
          parentNode.scrollTop = v.scrollTop;
        }
        if (v.scrollLeft !== undefined) {
          parentNode.scrollLeft = v.scrollLeft;
        }
      },
      onComplete: () => {
        toDispose.dispose();
      },
      duration: opts.duration!,
    });
    const toDispose = Disposable.create(() => {
      scrollTween.dispose();
      preTweenMap.delete(parentNode);
    });
    preTweenMap.set(parentNode, toDispose);
    return toDispose;
  }
  return Disposable.NULL;
}
