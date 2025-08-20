/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Disposable, type IPoint, Rectangle } from '@flowgram.ai/utils';
import {
  Bounds,
  EntityData,
  PositionSchema,
  type SizeSchema,
  TransformData,
} from '@flowgram.ai/core';

import type { FlowNodeEntity } from '../entities';
import { FlowNodeRenderData } from './flow-node-render-data';

export interface FlowNodeTransformSchema {
  size: SizeSchema; // 当前节点大小
}

export class FlowNodeTransformData extends EntityData<FlowNodeTransformSchema> {
  static type = 'FlowNodeTransformData';

  // 这里加 declare 原因：覆盖了 EntityData 默认的 EntityType，如果不声明会报 TS2612 错误
  declare entity: FlowNodeEntity;

  transform: TransformData;

  renderState: FlowNodeRenderData;

  localDirty = true;

  get origin() {
    return this.transform.origin;
  }

  get key(): string {
    return this.entity.id;
  }

  getDefaultData(): FlowNodeTransformSchema {
    const { size, hidden } = this.entity.getNodeMeta();
    // 更新默认 size 大小
    return {
      size: !hidden ? { ...size } : { width: 0, height: 0 },
    };
  }

  constructor(entity: FlowNodeEntity) {
    super(entity);
    const { origin } = this.entity.getNodeMeta();
    this.transform = this.entity.addData<TransformData>(TransformData);
    this.transform.changeLocked = true;
    this.transform.update({ origin: { ...origin } });
    this.transform.changeLocked = false;
    this.renderState = this.entity.addData<FlowNodeRenderData>(FlowNodeRenderData);
    this.bindChange(this.transform);
    // 删除节点要让下一个节点或者父节点变成 dirty
    this.toDispose.push(
      Disposable.create(() => {
        const { next, parent } = this;
        if (next) next.localDirty = true;
        if (parent) parent.localDirty = true;
      })
    );
    // this.bindChange(this.renderState)
  }

  /**
   * 获取节点是否展开
   */
  get collapsed(): boolean {
    return this.entity.collapsed;
  }

  set collapsed(collapsed: boolean) {
    this.entity.collapsed = collapsed;
    this.localDirty = true;

    // 第一个子节点也设置为 dirty
    if (this.firstChild) this.firstChild.localDirty = true;

    this.fireChange();
  }

  /**
   * 获取节点的大小
   */
  get size(): SizeSchema {
    return this.entity.memoGlobal<SizeSchema>('size', () => {
      if (this.isContainer) return this.transform.localSize;
      return this.data.size;
    });
  }

  get position(): PositionSchema {
    const { position } = this.transform;
    return {
      x: position.x,
      y: position.y,
    };
  }

  set position(position: PositionSchema) {
    this.transform.update({
      position,
    });
  }

  set size(size: SizeSchema) {
    const { width, height } = this.data.size;
    // Container size 由子节点决定
    if (this.isContainer) return;
    if (size.width !== width || size.height !== height) {
      this._data.size = { ...size };
      this.localDirty = true;
      this.fireChange();
    }
  }

  get inputPoint() {
    return this.entity.memoGlobal<IPoint>('inputPoint', () => {
      const { getInputPoint } = this.entity.getNodeRegistry();
      return getInputPoint
        ? getInputPoint(this, this.entity.document.layout)
        : this.defaultInputPoint;
    });
  }

  get defaultInputPoint() {
    return this.entity.memoGlobal<IPoint>('defaultInputPoint', () =>
      this.entity.document.layout.getDefaultInputPoint(this.entity)
    );
  }

  get defaultOutputPoint() {
    return this.entity.memoGlobal<IPoint>('defaultOutputPoint', () =>
      this.entity.document.layout.getDefaultOutputPoint(this.entity)
    );
  }

  get outputPoint() {
    return this.entity.memoGlobal<IPoint>('outputPoint', () => {
      const { getOutputPoint } = this.entity.getNodeRegistry();
      return getOutputPoint
        ? getOutputPoint(this, this.entity.document.layout)
        : this.defaultOutputPoint;
    });
  }

  /**
   * 原点的最左偏移
   */
  get originDeltaX(): number {
    return this.entity.memoLocal<number>('originDeltaX', () => {
      const { children } = this;
      const { getOriginDeltaX } = this.entity.getNodeRegistry();
      if (getOriginDeltaX) return getOriginDeltaX(this, this.entity.document.layout);
      // 没有子节点，则采用自身的原点偏移
      if (children.length === 0) {
        return -this.size.width * this.origin.x;
      }
      // 采用子节点的最左偏移量来计算
      if (children.length === 1) return children[0].originDeltaX;
      // 这里代表水平偏移，则采用第一个节点加上自身偏移
      if (this.entity.isInlineBlocks && children.length > 1) {
        return children[0].originDeltaX + this.transform.position.x;
      }
      return children.reduce((res: undefined | number, child) => {
        const deltaX = child.originDeltaX;
        return res === undefined || deltaX < res ? deltaX : (res as number);
      }, undefined) as number;
    });
  }

  /**
   * 原点 y 轴偏移
   */
  get originDeltaY(): number {
    return this.entity.memoLocal<number>('originDeltaY', () => {
      const { children } = this;
      const { getOriginDeltaY } = this.entity.getNodeRegistry();
      if (getOriginDeltaY) return getOriginDeltaY(this, this.entity.document.layout);
      // 没有子节点，则采用自身的原点偏移
      if (children.length === 0) {
        return -this.size.height * this.origin.y;
      }
      // 采用子节点的最上偏移量来计算
      if (children.length === 1) return children[0].originDeltaY;
      // 这里代表水平偏移，则采用第一个节点加上自身偏移
      if (this.entity.isInlineBlocks && children.length > 1) {
        return children[0].originDeltaY + this.transform.position.y;
      }
      return children.reduce((res: undefined | number, child) => {
        const deltaY = child.originDeltaY;
        return res === undefined || deltaY < res ? deltaY : (res as number);
      }, undefined) as number;
    });
  }

  /**
   * 绝对坐标 bbox, 不包含自身的 spacing(marginBottom), 但是包含 inlineSpacing 和 子节点的 spacing
   */
  get bounds(): Rectangle {
    return this.entity.memoGlobal<Rectangle>('bounds', () => {
      const { transform } = this;

      if (this.isContainer) {
        const childrenRects = transform.children.map(
          (c) => c.entity.getData<FlowNodeTransformData>(FlowNodeTransformData)!.boundsWithPadding
        );
        // Container 要加上 inlineSpacing
        return Rectangle.enlarge(childrenRects).withPadding(this.padding);
      }
      return transform.bounds; // 单个节点取默认的 bounds
    });
  }

  get boundsWithPadding(): Rectangle {
    return this.entity.memoGlobal<Rectangle>('boundsWithPadding', () => {
      const { transform } = this;

      if (this.isContainer) {
        const childrenRects = transform.children.map(
          (c) => c.entity.getData<FlowNodeTransformData>(FlowNodeTransformData)!.boundsWithPadding
        );
        return Rectangle.enlarge(childrenRects).withPadding(this.padding);
      }
      return transform.bounds.clone().withPadding(this.padding);
    });
  }

  get isContainer(): boolean {
    return this.transform.isContainer;
  }

  /**
   * 相对坐标 bbox, 这里的 localBounds 会加入 padding 一起算
   */
  get localBounds(): Rectangle {
    return this.entity.memoLocal<Rectangle>('localBounds', () => {
      const { transform } = this;

      if (this.isContainer) {
        const childrenRects = transform.children.map(
          (c) => c.entity.getData<FlowNodeTransformData>(FlowNodeTransformData)!.localBounds
        );
        const childrenBounds = Rectangle.enlarge(childrenRects).withPadding(this.padding);
        return Bounds.applyMatrix(childrenBounds, transform.localTransform);
      }

      return transform.localBounds.clone().withPadding(this.padding);
    });
  }

  get padding() {
    return this.entity.document.layout.getPadding(this.entity);
  }

  setParentTransform(transform?: FlowNodeTransformData): void {
    // 拖拽父元素变化需要重新布局
    if (this.transform.parent !== transform?.transform) {
      this.localDirty = true;
    }
    this.transform.setParent(transform?.transform);
  }

  get spacing(): number {
    const { spacing } = this.entity.getNodeMeta();
    return typeof spacing === 'function' ? spacing(this) : spacing;
  }

  get inlineSpacingPre(): number {
    const { inlineSpacingPre } = this.entity.getNodeMeta();
    return typeof inlineSpacingPre === 'function' ? inlineSpacingPre(this) : inlineSpacingPre;
  }

  get inlineSpacingAfter(): number {
    const { inlineSpacingAfter } = this.entity.getNodeMeta();
    return typeof inlineSpacingAfter === 'function' ? inlineSpacingAfter(this) : inlineSpacingAfter;
  }

  get minInlineBlockSpacing(): number {
    const { minInlineBlockSpacing } = this.entity.getNodeMeta();
    return typeof minInlineBlockSpacing === 'function'
      ? minInlineBlockSpacing(this)
      : minInlineBlockSpacing;
  }

  get children(): FlowNodeTransformData[] {
    return this.entity.children.map(
      (child) => child.getData<FlowNodeTransformData>(FlowNodeTransformData)!
    );
  }

  /**
   * 上一个节点的 transform 数据
   */
  get pre(): FlowNodeTransformData | undefined {
    return this.entity.pre?.getData<FlowNodeTransformData>(FlowNodeTransformData);
  }

  get originParent(): FlowNodeTransformData | undefined {
    return this.entity.originParent?.getData<FlowNodeTransformData>(FlowNodeTransformData);
  }

  get isFirst(): boolean {
    return this.entity.isFirst;
  }

  get isLast(): boolean {
    return this.entity.isLast;
  }

  get lastChild(): FlowNodeTransformData | undefined {
    return this.entity.lastChild?.getData<FlowNodeTransformData>(FlowNodeTransformData);
  }

  get firstChild(): FlowNodeTransformData | undefined {
    return this.entity.firstChild?.getData<FlowNodeTransformData>(FlowNodeTransformData);
  }

  /**
   * 下一个节点的 transform 数据
   */
  get next(): FlowNodeTransformData | undefined {
    return this.entity.next?.getData<FlowNodeTransformData>(FlowNodeTransformData);
  }

  /**
   * parent 节点的 transform 数据
   */
  get parent(): FlowNodeTransformData | undefined {
    return this.entity.parent?.getData<FlowNodeTransformData>(FlowNodeTransformData);
  }
}
