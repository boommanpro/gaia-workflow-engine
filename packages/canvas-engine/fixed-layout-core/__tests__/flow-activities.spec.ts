/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SPACING,
  FlowDocument,
  type FlowDocumentJSON,
  FlowNodeTransformData,
  FlowOperationBaseService,
} from '@flowgram.ai/document';

import {
  createDocumentContainer,
  dynamicSplitEmptyMock,
  dynamicSplitExpandedMock,
  dynamicSplitMock,
  extendChildNodeMock,
  loopEmpty,
  tryCatchMock,
} from './flow-activities.mock';

interface TransformTestData {
  // version: number
  localBoundsStr: string;
  // localID: number
  // worldID: number
  boundsStr: string;
}

function getTransformData(document: FlowDocument): Record<string, TransformTestData> {
  const data: Record<string, TransformTestData> = {};
  document.traverse((node) => {
    const transform = node.getData<FlowNodeTransformData>(FlowNodeTransformData)!;
    data[node.id] = {
      // version: transform.version,
      boundsStr: transform.bounds.toStyleStr(),
      localBoundsStr: transform.localBounds.toStyleStr(),
      // localID: transform.transform.localID, // 用来判断是否有更新
      // worldID: transform.transform.worldID,
    };
  });
  return data;
}

describe('flow-activities', () => {
  let container = createDocumentContainer();
  let document: FlowDocument;
  let operationService: FlowOperationBaseService;

  /**
   * 计算两次数据保证不变
   * @param data
   */
  function refreshTwice(data: FlowDocumentJSON): Record<string, TransformTestData> {
    document.fromJSON(data);
    document.transformer.refresh();
    const transformData = getTransformData(document);
    document.fromJSON(data);
    // 重新计算不会更新数据
    document.transformer.refresh();
    expect(transformData).toEqual(getTransformData(document));
    return transformData;
  }
  function get(key: string): FlowNodeTransformData {
    return document.getNode(key)!.getData<FlowNodeTransformData>(FlowNodeTransformData)!;
  }

  beforeEach(() => {
    container = createDocumentContainer();
    document = container.get<FlowDocument>(FlowDocument);
    operationService = container.get<FlowOperationBaseService>(FlowOperationBaseService);
  });
  it('create dynamic split', () => {
    const preData = refreshTwice(dynamicSplitMock);
    expect(document.toString()).toMatchSnapshot();
    expect(preData.split).toMatchSnapshot();
    expect(preData.$inlineBlocks$split).toMatchSnapshot();
  });
  it('insert a dynamic split node', () => {
    const preData = refreshTwice(dynamicSplitMock);
    // 添加一个新条件分支
    document.addFromNode('start_0', {
      id: 'split2',
      type: 'dynamicSplit',
      blocks: [{ id: 'b1' }, { id: 'b2' }],
    });
    document.transformer.refresh();
    expect(document.toString()).toMatchSnapshot();
    expect(document.getNode('start_0')!.next!.id).toEqual('split2');
    expect(document.getNode('split2')!.next!.id).toEqual('split');
    const nextData = getTransformData(document);
    expect(preData.start_0).toEqual(nextData.start_0);
    expect(nextData.split).toMatchSnapshot();
    expect(nextData.$inlineBlocks$split).toMatchSnapshot();
    expect(nextData.split2).toMatchSnapshot();
    expect(nextData.$inlineBlocks$split2).toMatchSnapshot();
  });
  it('create dynamic split expanded', () => {
    refreshTwice(dynamicSplitExpandedMock);
    expect(document.toString()).toMatchSnapshot();
    const trans1 = get('branch_0');
    const trans2 = get('s2_branch_0');
    // 这两个节点不能相交，左右间隔相差 20
    expect(trans1.bounds.right + DEFAULT_SPACING.MARGIN_RIGHT).toEqual(trans2.bounds.left);
    // 两条分支是左右对称关系，不受子节点影响
  });
  /**
   * 分支居中对齐
   */
  it('dynamic split branch middle origin', () => {
    refreshTwice(dynamicSplitExpandedMock);
    let iconCenter = get('$blockIcon$split').bounds.center.x;
    let branch0Center = get('$blockOrderIcon$branch_0').bounds.center.x;
    let branch1Center = get('$blockOrderIcon$branch_1').bounds.center.x;
    // icon 在两个分支之间
    expect(iconCenter - branch0Center).toEqual(branch1Center - iconCenter);
    iconCenter = get('$blockIcon$split2').bounds.center.x;
    branch0Center = get('$blockOrderIcon$s2_branch_0').bounds.center.x;
    branch1Center = get('$blockOrderIcon$s2_branch_1').bounds.center.x;
    expect(iconCenter - branch0Center).toEqual(branch1Center - iconCenter);
  });
  it('create tryCatch', () => {
    refreshTwice(tryCatchMock);
    expect(document.toString()).toMatchSnapshot();
  });
  it('tryCatch add branch', () => {
    refreshTwice(tryCatchMock);
    document.addBlock('tryCatch', { id: 'xxxx' });
    expect(document.toString()).toMatchSnapshot();
  });
  it('create loop empty', () => {
    document.fromJSON(loopEmpty);
    expect(document.toString()).toMatchSnapshot();
    refreshTwice(loopEmpty);
  });
  it('loop addChild', () => {
    document.fromJSON(loopEmpty);
    operationService.addNode(
      {
        id: 'test1',
        type: 'test',
      },
      {
        parent: 'loop_0',
        index: 0,
      }
    );
    operationService.addNode(
      {
        id: 'test2',
        type: 'test',
      },
      {
        parent: 'loop_0',
      }
    );
    expect(document.toString()).toMatchSnapshot();
  });
  it('split addChild', () => {
    document.fromJSON(dynamicSplitMock);
    const node = operationService.addNode(
      {
        id: 'branch_2',
        type: 'block',
      },
      {
        parent: 'split',
        index: 1,
        hidden: true,
      }
    );
    expect(document.toString()).toMatchSnapshot();
    expect(node.hidden).toBeTruthy();
  });
  it('empty split addChild', () => {
    document.fromJSON(dynamicSplitEmptyMock);
    operationService.addNode(
      {
        id: 'branch',
        type: 'block',
      },
      {
        parent: 'empty-split',
      }
    );
    expect(document.toString()).toMatchSnapshot();
  });
  it('block addChild', () => {
    document.fromJSON(dynamicSplitMock);
    operationService.addNode(
      {
        id: 'test',
        type: 'test',
      },
      {
        parent: 'branch_0',
        index: 0,
      }
    );
    expect(document.toString()).toMatchSnapshot();
  });
  it('extend block addChild', () => {
    document.registerFlowNodes(extendChildNodeMock);
    document.fromJSON(dynamicSplitEmptyMock);
    operationService.addNode(
      {
        id: 'test-extend',
        type: 'test-extend',
      },
      {
        parent: 'root',
        index: 1,
      }
    );
    operationService.addNode(
      {
        id: 'test-extend-block',
        type: 'block',
      },
      {
        parent: 'test-extend',
        index: 0,
      }
    );
    operationService.addNode(
      {
        id: 'test',
        type: 'test',
      },
      {
        parent: 'test-extend-block',
        index: 0,
      }
    );
    expect(document.toString()).toMatchSnapshot();
  });
});
