/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { TransformData } from '@flowgram.ai/core';

import { FlowDocument, FlowNodeTransformData } from '../src';
import { baseMockAddNode } from './flow.mock';
import { createDocumentContainer } from './flow-document-container.mock';

interface TransformTestData {
  version: number;
  localBoundsStr: string;
  localID: number;
  worldID: number;
  boundsStr: string;
}

function getTransformData(document: FlowDocument): Record<string, TransformTestData> {
  const data: Record<string, TransformTestData> = {};
  document.traverse((node) => {
    const transform = node.getData<FlowNodeTransformData>(FlowNodeTransformData)!;
    data[node.id] = {
      version: transform.version,
      boundsStr: transform.bounds.toStyleStr(),
      localBoundsStr: transform.localBounds.toStyleStr(),
      localID: transform.transform.localID, // 用来判断是否有更新
      worldID: transform.transform.worldID,
    };
  });
  return data;
}

describe('flow-document-transformer', () => {
  let container = createDocumentContainer();
  beforeEach(() => {
    container = createDocumentContainer();
    container.get(FlowDocument).fromJSON(baseMockAddNode);
  });
  it('updateTransformsTree', () => {
    const document = container.get<FlowDocument>(FlowDocument);
    document.transformer.updateTransformsTree();
    // root 会包含三个子节点：start_0, dynamicSplit_0, end_0
    expect(document.root.getData<TransformData>(TransformData)!.children.length).toEqual(3);
  });
  it('transform version', () => {
    const document = container.get<FlowDocument>(FlowDocument);
    const preData = getTransformData(document);
    document.transformer.refresh();
    const postData = getTransformData(document);
    expect(preData.root.version).toEqual(0);
    expect(preData.start_0).toEqual({
      version: 0,
      boundsStr: 'left: 0px; top: 0px; width: 0px; height: 0px;',
      localBoundsStr: 'left: 0px; top: 0px; width: 0px; height: 0px;',
      localID: 0,
      worldID: 0,
    });
    expect(postData.start_0).toEqual({
      version: 2, // 更新了 size 和 position
      boundsStr: 'left: -140px; top: 0px; width: 280px; height: 60px;',
      localBoundsStr: 'left: -140px; top: 0px; width: 280px; height: 60px;',
      localID: 2, // 更新了 size 和 position
      worldID: 1,
    });
    expect(postData.root).toEqual({
      version: 0,
      boundsStr: 'left: -140px; top: 0px; width: 280px; height: 428px;',
      localBoundsStr: 'left: -140px; top: 0px; width: 280px; height: 428px;',
      localID: 0, // 只更新了 position
      worldID: 0,
    });
  });
  it('refresh', () => {
    const document = container.get<FlowDocument>(FlowDocument);
    document.transformer.refresh();
    const preData = getTransformData(document);
    document.transformer.refresh();
    const nextData = getTransformData(document);
    // 数据没有变化
    expect(preData).toEqual(nextData);
  });
  it('transform with tree change', () => {
    const document = container.get<FlowDocument>(FlowDocument);
    document.transformer.refresh();
    const preData = getTransformData(document);
    expect(preData.dynamicSplit_0).toEqual({
      version: 3,
      boundsStr: 'left: -140px; top: 92px; width: 280px; height: 244px;',
      localBoundsStr: 'left: -140px; top: 92px; width: 280px; height: 244px;',
      localID: 3,
      worldID: 1,
    });
    // expect(preData.$blockOrderIcon$block_1).toEqual({
    //   version: 2,
    //   boundsStr: 'left: -140px; top: 184px; width: 280px; height: 60px;',
    //   localBoundsStr: 'left: -140px; top: 0px; width: 280px; height: 60px;',
    //   localID: 2,
    //   worldID: 1,
    // })
    document.addFromNode('start_0', { id: 'test', type: 'test' });
    document.transformer.refresh();
    const nextData = getTransformData(document);
    expect(preData.start_0).toEqual(nextData.start_0);
    expect(nextData.dynamicSplit_0).toEqual({
      version: 4,
      boundsStr: 'left: -140px; top: 184px; width: 280px; height: 244px;',
      localBoundsStr: 'left: -140px; top: 184px; width: 280px; height: 244px;',
      localID: 4,
      worldID: 2,
    });
    // 子节点页跟着更新
    // expect(nextData.$blockOrderIcon$block_1).toEqual({
    //   version: 2, // 由于 local 未更新所以 version 没变
    //   boundsStr: 'left: -140px; top: 276px; width: 280px; height: 60px;',
    //   localBoundsStr: 'left: -140px; top: 0px; width: 280px; height: 60px;',
    //   localID: 2, // local 相对位置未更新
    //   worldID: 2, // world 绝对位置更新
    // })
  });
});
