/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Rectangle } from '@flowgram.ai/utils';
import {
  FlowDocument,
  FlowNodeTransitionData,
  FlowTransitionLabelEnum,
  LABEL_SIDE_TYPE,
} from '@flowgram.ai/document';
import { EntityManager, PlaygroundConfigEntity, PlaygroundContext } from '@flowgram.ai/core';

import { FlowDragEntity } from '../../src/entities/flow-drag-entity';
import { flowJson } from '../../__mocks__/flow-json.mock';
import {
  NOT_SCROLL_EVENT,
  SCROLL_BOTTOM_EVENT,
  SCROLL_LEFT_EVENT,
  SCROLL_RIGHT_EVENT,
  SCROLL_TOP_EVENT,
} from '../../__mocks__/flow-drag-entity';
import { createDocumentContainer } from '../../__mocks__/flow-document-container.mock';

// layer 层 drag entity 单测
describe('flow-drag-entity', () => {
  let container = createDocumentContainer();
  let document: FlowDocument;
  let flowDragEntity: FlowDragEntity;
  let nodeTransition: FlowNodeTransitionData;
  let firstBranchTransition: FlowNodeTransitionData;
  const collisionRect = new Rectangle(-50, -50, 100, 100);
  const notCollisionRect = new Rectangle(50, 50, 100, 100);

  beforeEach(() => {
    container = createDocumentContainer();
    document = container.get<FlowDocument>(FlowDocument);
    const entityManager = container.get<EntityManager>(EntityManager);
    container.bind(PlaygroundContext).toConstantValue({});
    document.fromJSON(flowJson);
    flowDragEntity = new FlowDragEntity({ entityManager });
    const playgroundConfigEntity =
      entityManager.getEntity<PlaygroundConfigEntity>(PlaygroundConfigEntity);
    playgroundConfigEntity?.updateConfig({
      clientX: 0,
      clientY: 0,
      width: 3000,
      height: 3000,
    });
    const nodeEntity = document.getNode('$blockIcon$approval_fc79f9fa62f');
    nodeTransition = nodeEntity?.getData<FlowNodeTransitionData>(
      FlowNodeTransitionData
    ) as FlowNodeTransitionData;
    const firstBranchEntity = document.getNode('branch_8864cf1f9d3');
    firstBranchTransition = firstBranchEntity?.getData<FlowNodeTransitionData>(
      FlowNodeTransitionData
    ) as FlowNodeTransitionData;
  });

  it('flow drag scroll', () => {
    const el = global.document.createElement('div');
    // 页面不滚动
    expect(flowDragEntity.scrollDirection(NOT_SCROLL_EVENT, el, 0, 0)).toMatchSnapshot();
    // 页面滚动
    expect(flowDragEntity.scrollDirection(SCROLL_TOP_EVENT, el, 0, 0)).toMatchSnapshot();
    expect(flowDragEntity.scrollDirection(SCROLL_LEFT_EVENT, el, 0, 0)).toMatchSnapshot();
    expect(flowDragEntity.scrollDirection(SCROLL_RIGHT_EVENT, el, 0, 0)).toMatchSnapshot();
    expect(flowDragEntity.scrollDirection(SCROLL_BOTTOM_EVENT, el, 0, 0)).toMatchSnapshot();
    // 停止滚动
    flowDragEntity.stopAllScroll();
    expect(flowDragEntity.hasScroll).toEqual(false);
  });

  it('flow drag node collision true', () => {
    // 测试默认 offset x y 为 0
    expect(flowDragEntity.isCollision(nodeTransition, collisionRect, false)).toEqual({
      hasCollision: true,
      labelOffsetType: undefined,
    });
  });

  it('flow drag node label empty', () => {
    expect(flowDragEntity.isCollision(nodeTransition, notCollisionRect, false)).toEqual({
      hasCollision: false,
      labelOffsetType: undefined,
    });
  });

  it('flow drag node collision false', () => {
    const emptyLabelNodeTransition = {
      ...nodeTransition,
      labels: [{ type: FlowTransitionLabelEnum.BRANCH_DRAGGING_LABEL, offset: { x: 0, y: 0 } }],
    } as FlowNodeTransitionData;
    expect(flowDragEntity.isCollision(emptyLabelNodeTransition, collisionRect, false)).toEqual({
      hasCollision: false,
      labelOffsetType: undefined,
    });
  });

  it('flow drag branch collision true', () => {
    const preBranchNodeTransition = {
      ...firstBranchTransition,
      labels: [
        {
          type: FlowTransitionLabelEnum.BRANCH_DRAGGING_LABEL,
          props: {
            side: LABEL_SIDE_TYPE.PRE_BRANCH,
          } as any,
          offset: { x: 0, y: 0 },
        },
      ],
    } as FlowNodeTransitionData;
    // 第一个分支场景，校验 labelOffsetType 场景
    expect(flowDragEntity.isCollision(preBranchNodeTransition, collisionRect, true)).toEqual({
      hasCollision: true,
      labelOffsetType: LABEL_SIDE_TYPE.PRE_BRANCH,
    });
  });

  it('flow drag branch collision false', () => {
    const preBranchNodeTransition = {
      ...firstBranchTransition,
      labels: [
        {
          type: FlowTransitionLabelEnum.BRANCH_DRAGGING_LABEL,
          props: {
            side: LABEL_SIDE_TYPE.PRE_BRANCH,
          } as any,
          offset: { x: 0, y: 0 },
        },
      ],
    } as FlowNodeTransitionData;
    expect(flowDragEntity.isCollision(preBranchNodeTransition, notCollisionRect, true)).toEqual({
      hasCollision: false,
      labelOffsetType: LABEL_SIDE_TYPE.NORMAL_BRANCH,
    });
  });

  it('flow drag dispose', () => {
    flowDragEntity.dispose();
    expect(flowDragEntity.toDispose.disposed).toEqual(true);
  });
});
