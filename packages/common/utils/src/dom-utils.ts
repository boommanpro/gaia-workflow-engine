/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import clx from 'clsx';

import { each } from './objects';
import { Disposable } from './disposable';
import { Cache, type CacheManager } from './cache';

const toStyleKey = (key: string) => key.replace(/([A-Z])/, (k) => `-${k.toLowerCase()}`);

export type CSSStyle = {
  [P in keyof CSSStyleDeclaration]?: string | number | undefined;
};

export interface DOMCache extends HTMLElement, Disposable {
  setStyle(style: CSSStyle): void;
  key?: string | number;
}

export namespace domUtils {
  export function toPixel(num: number): string {
    return `${num}px`;
  }

  // export function fromPixel(pixel: string): number {
  //   return parseInt(pixel.substring(0, pixel.length - 2));
  // }

  export function fromPercent(percent: string): number {
    return parseFloat(percent.substring(0, percent.length - 1));
  }

  export function toPercent(percent: number): string {
    return `${percent}%`;
  }

  export function enableEvent(element: HTMLDivElement): void {
    element.style.pointerEvents = 'all';
  }

  export function disableEvent(element: HTMLDivElement): void {
    element.style.pointerEvents = 'none';
  }

  export function createElement<T extends HTMLElement>(ele: string, ...classNames: string[]): T {
    const element = document.createElement(ele);
    if (classNames.length > 0) {
      element.className = clx(classNames);
    }
    return element as T;
  }

  export function createDivWithClass(...classNames: string[]): HTMLDivElement {
    return createElement('div', ...classNames) as HTMLDivElement;
  }

  export function addClass(element: Element, ...classNames: string[]): void {
    element.className = clx(classNames.concat(element.className.split(' ')));
  }

  export function delClass(element: Element, ...classNames: string[]): void {
    classNames.forEach((name) => {
      element.classList.remove(name);
    });
    element.className = element.classList.toString();
  }

  export function coverClass(element: Element, ...classNames: string[]): void {
    element.className = clx(classNames);
  }

  export function clearChildren(container: HTMLDivElement): void {
    container.innerHTML = '';
  }

  export function translatePercent(node: HTMLDivElement, x: number, y: number): void {
    node.style.transform = `translate(${x}%, ${y}%)`;
  }

  export function translateXPercent(node: HTMLDivElement, x: number): void {
    node.style.transform = `translateX(${x}%)`;
  }

  export function translateYPercent(node: HTMLDivElement, y: number): void {
    node.style.transform = `translateY(${y}%)`;
  }

  export function setStyle(node: HTMLElement, styles: CSSStyle): void {
    const styleStrs: string[] = [];
    each(styles, (value, key) => {
      if (value === undefined) return;
      if (typeof value === 'number' && key !== 'opacity' && key !== 'zIndex' && key !== 'scale') {
        value = toPixel(value);
      }
      styleStrs.push(`${toStyleKey(key)}:${value}`);
    });
    const oldStyle = node.getAttribute('style');
    const newStyle = styleStrs.join(';');
    if (oldStyle !== newStyle) {
      node.setAttribute('style', newStyle);
    }
  }

  export function classNameWithPrefix(prefix: string): (key: string, opts?: any) => string {
    return (key: string, opts?: any) =>
      clx(
        key
          .split(/\s+/)
          .map((s) => `${prefix}-${s}`)
          .join(' '),
        opts
      );
  }

  export function addStandardDisposableListener(
    dom: HTMLElement | HTMLDocument,
    type: string,
    listener: EventListenerOrEventListenerObject | any,
    options?: boolean | any
  ): Disposable {
    dom.addEventListener(type, listener, options);
    return Disposable.create(() => {
      dom.removeEventListener(type, listener);
    });
  }

  /**
   * dom 缓存
   * @param parent
   * @param className
   */
  export function createDOMCache<T extends DOMCache = DOMCache>(
    parent: HTMLElement,
    className: string | (() => HTMLElement),
    children?: string
  ): CacheManager<T> {
    return Cache.create<T>((/* item */) => {
      // item 悬空了？
      const dom =
        typeof className === 'string' ? domUtils.createDivWithClass(className) : className();
      if (children) {
        dom.innerHTML = children;
      }
      parent.appendChild(dom);
      return Object.assign(dom, {
        // key: item ? item.key : undefined,
        dispose: () => {
          const { parentNode } = dom;
          if (parentNode) {
            parentNode.removeChild(dom);
          }
        },
        setStyle: (style: CSSStyle) => {
          domUtils.setStyle(dom, style);
        },
      }) as T;
    });
  }
}
