/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import {
  type CacheManager,
  type Disposable,
  DisposableCollection,
  type DOMCache,
  domUtils,
} from '@flowgram.ai/utils';

// import { Adsorber } from '../utils/adsorber';
// import { PlaygroundDrag, type PlaygroundDragEntitiesOpts } from '../utils';
import { type PipelineEntities } from '../pipeline/pipeline-entities';
import { type PipeEventName, type PipelineDimension, type PipeSupportEvent } from '../pipeline';
import {
  EntityManager,
  injectPlaygroundContext,
  PlaygroundContext,
  type PositionSchema,
} from '../../common';
// import { SelectionService } from '@flowgram.ai/application-common';
import { type PlaygroundConfigEntity } from './config';

export interface LayerOptions {}

export const LayerOptions = Symbol('LayerOptions');

/**
 * 基础 layer
 */
@injectable()
export class Layer<
  OPT extends LayerOptions = any,
  CONTEXT extends PlaygroundContext = PlaygroundContext
> {
  /**
   * layer 的配置, 由 registerLayer(Layer, LayerOptions) 传入
   */
  @inject(LayerOptions) options: OPT;

  protected readonly toDispose = new DisposableCollection();

  /**
   * layer 可能存在 dom 也可能没有，如果有，则会加入到 pipeline 的 dom 节点上
   */
  node: HTMLElement;

  /**
   * 父节点
   */
  pipelineNode: HTMLElement;

  /**
   * 画布根节点
   */
  playgroundNode: HTMLElement;

  // /**
  //  * 发送 payload
  //  * @param payloadKey
  //  * @param payloadValue
  //  * @param cb - layer 触发 autorun 后的回调
  //  */
  // dispatch<P>(payloadKey: string | symbol, payloadValue: P, cb?: () => void): void {}

  /**
   * 当前 layer 的所有监听的实体数据
   */
  observeManager: PipelineEntities;

  /**
   * 实体管理器
   */
  @inject(EntityManager) readonly entityManager: EntityManager;

  @injectPlaygroundContext() readonly context: CONTEXT;

  /**
   * 自动触发更新，在不需要 react 的时候用这个方法
   */
  autorun?(): void;

  /**
   * 绘制 react
   */
  render?(): JSX.Element;

  /**
   * 默认在渲染时候都会启用 react memo 进行隔离，这种情况就需要数据驱动更新
   */
  renderWithReactMemo = true;

  /**
   * 全局选择
   */
  // selectionService?: SelectionService;
  /**
   * 监听 playground 上的事件
   * 规则：
   *  1. 按 priority 排序，越高先执行
   *  2. 没有提供，按 layer 的注册顺序，后注册先执行 (符合冒泡排序)
   *  3. 执行返回 true，则阻止后续的执行
   */
  listenPlaygroundEvent: (
    name: PipeEventName,
    handle: (event: PipeSupportEvent) => boolean | void,
    priority?: number,
    options?: AddEventListenerOptions
  ) => Disposable;

  /**
   * 监听 document 上的事件
   * 规则：
   *  1. 按 priority 排序，越高先执行
   *  2. 没有提供，按 layer 的注册顺序，后注册先执行 (符合冒泡排序)
   *  3. 执行返回 true，则阻止后续的执行
   */
  listenGlobalEvent: (
    name: PipeEventName,
    handle: (event: PipeSupportEvent) => boolean | void,
    priority?: number,
    options?: AddEventListenerOptions
  ) => Disposable;

  /**
   * 初始化时候触发
   */
  onReady?(): void;

  /**
   * playground 大小变化时候会触发
   */
  onResize?(size: PipelineDimension): void;

  /**
   * playground focus 时候触发
   */
  onFocus?(): void;

  /**
   * playground blur 时候触发
   */
  onBlur?(): void;

  /**
   * 监听缩放
   */
  onZoom?(zoom: number): void;

  /**
   * 监听滚动
   */
  onScroll?(scroll: { scrollX: number; scrollY: number }): void;

  /**
   * viewport 更新触发
   */
  onViewportChange?(): void;

  /**
   * readonly 或 disable 状态变化
   * @param state
   */
  onReadonlyOrDisabledChange?(state: { disabled: boolean; readonly: boolean }): void;

  /**
   * playground 是否 focused
   */
  readonly isFocused: boolean;

  /**
   * 销毁
   */
  dispose(): void {
    this.toDispose.dispose();
  }

  /**
   * 创建 dom 缓冲池
   * @param className
   */
  createDOMCache<T extends DOMCache>(
    className: string | (() => HTMLElement),
    children?: string
  ): CacheManager<T> {
    if (!this.node) throw new Error('DomCache need a parent dom node.');
    return domUtils.createDOMCache<T>(this.node, className, children);
  }

  /**
   * 加载 layer 注册的实体数据，内部使用，不需要手动触发
   * @return 数据是否变化
   */
  declare reloadEntities: () => boolean;

  // /**
  //  * 在画布上拖动实体
  //  */
  // startDrag<T>(
  //   clientX: number,
  //   clientY: number,
  //   opts: PlaygroundDragEntitiesOpts<T> = {},
  // ): Disposable {
  //   const adsorbRefs = Adsorber.getRefsFromEntities(
  //     this.entityManager,
  //     opts.entities || [],
  //     this.config,
  //   );
  //   return PlaygroundDrag.startDrag(clientX, clientY, {
  //     ...opts,
  //     adsorbRefs,
  //     config: this.config,
  //   });
  // }

  /**
   * 全局画布配置
   */
  config: PlaygroundConfigEntity;

  /**
   * 获取鼠标在 Playground 的位置
   */
  getPosFromMouseEvent(
    event: { clientX: number; clientY: number },
    addScale = true
  ): PositionSchema {
    const pos = this.config.getPosFromMouseEvent(event, addScale);
    return {
      x: pos.x,
      y: pos.y,
    };
  }

  /**
   * 可以用于获取别的 layer
   */
  getOtherLayer: <T extends Layer>(layerRegistry: LayerRegistry<T>) => T | undefined;
}

export interface LayerRegistry<P extends Layer = Layer> {
  new (): P;
}
