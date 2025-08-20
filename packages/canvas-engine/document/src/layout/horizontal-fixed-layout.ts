/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable, inject, multiInject, optional } from 'inversify';
import { IPoint, OriginSchema, PaddingSchema, ScrollSchema, SizeSchema } from '@flowgram.ai/utils';

import { type FlowLayout, FlowLayoutDefault, FlowLayoutContribution } from '../typings';
import { type FlowDocument, FlowDocumentProvider } from '../flow-document';
import { FlowNodeEntity } from '../entities';
import { FlowNodeTransformData } from '../datas';

// 开始节点距离上边 36 像素
const DEFAULT_SCROLL = -36;

/**
 * 用于描述节点的结构特征
 */
interface FlowNodeTransformStructData {
  childrenLength: number;
  index: number;
}
/**
 * 用于描述节点的结构特征
 */
interface FlowNodeTransformStructData {
  childrenLength: number;
  index: number;
}

function isStructDataEqual(
  struct1: FlowNodeTransformStructData,
  struct2: FlowNodeTransformStructData
): boolean {
  return struct1.childrenLength === struct2.childrenLength && struct1.index === struct2.index;
}

@injectable()
export class HorizontalFixedLayout implements FlowLayout {
  name = FlowLayoutDefault.HORIZONTAL_FIXED_LAYOUT;

  protected structDataMap = new WeakMap<FlowNodeEntity, FlowNodeTransformStructData>();

  @inject(FlowDocumentProvider) protected documentProvider: FlowDocumentProvider;

  @multiInject(FlowLayoutContribution)
  @optional()
  contribs?: FlowLayoutContribution[];

  get document(): FlowDocument {
    return this.documentProvider();
  }

  reload() {
    this.structDataMap = new WeakMap();
  }

  /**
   * 更新布局
   */
  update(): void {
    this.updateLocalTransform(this.document.root);
  }

  /**
   * 更新节点的偏移
   * @param node
   * @param forceChange
   */
  updateLocalTransform(node: FlowNodeEntity, forceChange = false): boolean {
    const { children, parent, isInlineBlock } = node;

    const transform = node.getData<FlowNodeTransformData>(FlowNodeTransformData);
    const { getDelta, getOrigin } = node.getNodeRegistry();
    const lastStructData = this.structDataMap.get(node) || {
      childrenLength: 0,
      index: -1,
    };
    // 重新计算都要清空 bounds 缓存，因为 bounds 依赖所有
    node.clearMemoGlobal();
    let localDirty = transform.localDirty || forceChange;
    const newStructData: FlowNodeTransformStructData = {
      index: node.index,
      childrenLength: node.children.length,
    };
    // index 变化也要重新计算
    if (!isStructDataEqual(lastStructData, newStructData)) {
      localDirty = true;
      this.structDataMap.set(node, newStructData);
    }
    // Step1: 计算子节点
    let siblingDirty = false;
    if (children.length > 0) {
      for (const child of children) {
        const childDirty = this.updateLocalTransform(child, siblingDirty);
        // 子节点变更则父节点跟着变更
        if (childDirty) {
          siblingDirty = true;
          localDirty = true;
        }
      }
    }
    // 如果没有变更则不执行
    if (!localDirty) return false;
    // Step2: 计算节点的 position 偏移量
    node.clearMemoLocal();
    transform.transform.update({
      origin: getOrigin ? getOrigin(transform, this) : this.getDefaultNodeOrigin(),
    });
    const preTransform = transform.pre;
    const delta = getDelta?.(transform, this) || { x: 0, y: 0 };
    const inlineSpacingPre =
      isInlineBlock && transform.parent?.inlineSpacingPre ? transform.parent?.inlineSpacingPre : 0;
    const fromParentDelta = parent?.getNodeRegistry().getChildDelta?.(transform, this) || {
      x: 0,
      y: 0,
    };
    delta.x += fromParentDelta.x;
    delta.y += fromParentDelta.y;

    // Step3：根据上一个节点的相对偏移算当前偏移
    const position = { x: delta.x, y: delta.y };
    // 水平布局
    if (isInlineBlock) {
      position.x += inlineSpacingPre;
    } else {
      position.x += preTransform?.localBounds.right || 0;
      position.x += preTransform?.spacing || 0;
    }

    transform.transform.update({
      size: transform.data.size,
      position,
    });

    // 布局结束后可执行额外逻辑
    this.onAfterUpdateLocalTransform(transform);

    transform.localDirty = false;

    return true;
  }

  onAfterUpdateLocalTransform(transform: FlowNodeTransformData) {
    // 执行 register 上的 onAfterUpdateLocalTransform
    const { onAfterUpdateLocalTransform } = transform.entity.getNodeRegistry();
    onAfterUpdateLocalTransform?.(transform, this);

    // 执行 contribution 上的 onAfterUpdateLocalTransform
    this.contribs?.forEach((_contrib) => {
      _contrib?.onAfterUpdateLocalTransform?.(transform, this);
    });
  }

  getNodeTransform(node: FlowNodeEntity): FlowNodeTransformData {
    return node.getData(FlowNodeTransformData)!;
  }

  getPadding(node: FlowNodeEntity): PaddingSchema {
    const { inlineSpacingPre, inlineSpacingAfter, padding } = node.getNodeMeta();
    const transform = this.getNodeTransform(node);
    if (padding) {
      return typeof padding === 'function' ? padding(transform) : padding;
    }

    const paddingPre =
      typeof inlineSpacingPre === 'function' ? inlineSpacingPre(transform) : inlineSpacingPre;
    const paddingAfter =
      typeof inlineSpacingAfter === 'function' ? inlineSpacingAfter(transform) : inlineSpacingAfter;

    return {
      left: paddingPre,
      top: 0,
      right: paddingAfter,
      bottom: 0,
    };
  }

  getInitScroll(contentSize: SizeSchema): ScrollSchema {
    return {
      scrollX: DEFAULT_SCROLL,
      scrollY: -contentSize.height / 2,
    };
  }

  getDefaultInputPoint(node: FlowNodeEntity): IPoint {
    return this.getNodeTransform(node).bounds.leftCenter;
  }

  getDefaultOutputPoint(node: FlowNodeEntity): IPoint {
    return this.getNodeTransform(node).bounds.rightCenter;
  }

  getDefaultNodeOrigin(): OriginSchema {
    return { x: 0, y: 0.5 };
  }
}
