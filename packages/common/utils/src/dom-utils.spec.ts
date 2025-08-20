/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect } from 'vitest';

import { domUtils as u } from './dom-utils';

describe('dom-utils', () => {
  test('toPixel', async () => {
    expect(u.toPixel(0)).toEqual('0px');
    expect(u.toPixel(1)).toEqual('1px');
    expect(u.toPixel(1.1)).toEqual('1.1px');
    expect(u.toPixel(+0)).toEqual('0px');
    expect(u.toPixel(-0)).toEqual('0px');
    expect(u.toPixel(-0.1)).toEqual('-0.1px');
  });

  test('fromPercent', async () => {
    expect(u.fromPercent('0%')).toEqual(0);
    expect(u.fromPercent('1%')).toEqual(1);
    expect(u.fromPercent('1.1%')).toEqual(1.1);
    expect(u.fromPercent('-0.1%')).toEqual(-0.1);
  });

  test('toPercent', async () => {
    expect(u.toPercent(0)).toEqual('0%');
    expect(u.toPercent(1)).toEqual('1%');
    expect(u.toPercent(1.1)).toEqual('1.1%');
    expect(u.toPercent(+0)).toEqual('0%');
    expect(u.toPercent(-0)).toEqual('0%');
    expect(u.toPercent(-0.1)).toEqual('-0.1%');
  });

  test('enableEvent', async () => {
    const el = document.createElement('div');
    expect(el.style.pointerEvents).toEqual('');
    u.enableEvent(el);
    expect(el.style.pointerEvents).toEqual('all');
  });

  test('disableEvent', async () => {
    const el = document.createElement('div');
    expect(el.style.pointerEvents).toEqual('');
    u.disableEvent(el);
    expect(el.style.pointerEvents).toEqual('none');

    u.enableEvent(el);
    expect(el.style.pointerEvents).toEqual('all');
  });

  test('createElement', async () => {
    expect(u.createElement('div', 'a', 'b').className).toEqual('a b');
  });

  test('createDivWithClass', async () => {
    expect(u.createDivWithClass('a', 'b').className).toEqual('a b');
    expect(u.createDivWithClass('a', 'b').tagName).toEqual('DIV');
  });

  test('addClass', async () => {
    const el = document.createElement('div');
    u.addClass(el, 'a', 'b');
    expect(el.className).toEqual('a b');

    el.className = 'c d';
    u.addClass(el, 'a', 'b');
    expect(el.className).toEqual('a b c d');
  });

  test('delClass', async () => {
    const el = document.createElement('div');
    u.addClass(el, 'a', 'b');
    u.delClass(el, 'a');
    expect(el.className).toEqual('b');
    u.delClass(el, 'b');
    expect(el.className).toEqual('');

    u.delClass(el, 'a', 'b');
    expect(el.className).toEqual('');
  });

  test('coverClass', async () => {
    const el = document.createElement('div');
    u.coverClass(el, 'a', 'b');
    expect(el.className).toEqual('a b');

    u.coverClass(el, 'a', 'c', 'd');
    expect(el.className).toEqual('a c d');
  });

  test('clearChildren', async () => {
    const el = document.createElement('div');
    el.innerHTML = '<a>link</a>';
    u.clearChildren(el);
    expect(el.innerHTML).toEqual('');

    const el1 = document.createElement('div');
    el1.appendChild(document.createElement('a'));
    expect(el1.innerHTML).toEqual('<a></a>');
    u.clearChildren(el1);
    expect(el.innerHTML).toEqual('');
  });

  test('translatePercent', async () => {
    const el = document.createElement('div');
    u.translatePercent(el, 0, 1);
    expect(el.style.transform).toEqual('translate(0%, 1%)');
  });

  test('translateXPercent', async () => {
    const el = document.createElement('div');
    u.translateXPercent(el, 0);
    expect(el.style.transform).toEqual('translateX(0%)');
  });

  test('translateYPercent', async () => {
    const el = document.createElement('div');
    u.translateYPercent(el, 1);
    expect(el.style.transform).toEqual('translateY(1%)');
  });

  test('setStyle', async () => {
    const el = document.createElement('div');
    u.setStyle(el, { width: 10, position: 'fixed', margin: '0 1px' });
    expect(el.style.width).toEqual('10px');
    expect(el.style.position).toEqual('fixed');
    expect(el.style.margin).toEqual('0px 1px');

    const el1 = document.createElement('div');
    u.setStyle(el1, { width: undefined });
    expect(el1.style.width).toEqual('');

    const el2 = document.createElement('div');
    u.setStyle(el2, { Width: 1, paddingTop: 1 } as any);
    expect(el2.style.width).toEqual('');
    expect(el2.style['padding-top' as any]).toEqual('1px');
    expect(el2.style['-width' as any]).toEqual(undefined);
  });

  test('classNameWithPrefix', async () => {
    expect(u.classNameWithPrefix('pre')('a b')).toEqual('pre-a pre-b');
    expect(u.classNameWithPrefix('pre-')('a b')).toEqual('pre--a pre--b');
  });

  test('addStandardDisposableListener', async () => {
    const el = document.createElement('div');
    let called = false;
    const disposable = u.addStandardDisposableListener(el, 'click', () => {
      called = true;
    });
    const event = document.createEvent('Event');
    event.initEvent('click');

    el.dispatchEvent(event);
    expect(called).toEqual(true);

    called = false;
    disposable.dispose();
    el.dispatchEvent(event);
    expect(called).toEqual(false);
  });

  test('createDOMCache', async () => {
    const parent = document.createElement('div');

    const cache1 = u.createDOMCache(parent, 'c1');
    expect(cache1.get()).toEqual(u.createDivWithClass('c1'));
    const el1 = cache1.get();
    el1.setStyle({ width: 1 });
    expect(el1.style.width).toEqual('1px');
    cache1.dispose();

    const cache2 = u.createDOMCache(parent, () => u.createDivWithClass('c2'), '<div />');
    const el2 = u.createDivWithClass('c2');
    el2.innerHTML = '<div />';
    expect(cache2.get()).toEqual(el2);
  });
});
