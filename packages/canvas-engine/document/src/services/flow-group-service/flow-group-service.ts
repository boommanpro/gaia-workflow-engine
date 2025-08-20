/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid } from 'nanoid';
import { inject, injectable } from 'inversify';
import { EntityManager } from '@flowgram.ai/core';

import { FlowNodeBaseType, FlowOperationBaseService, OperationType } from '../../typings';
import { FlowNodeEntity } from '../../entities';
import { FlowGroupUtils } from './flow-group-utils';
import { FlowGroupController } from './flow-group-controller';

@injectable()
/** 分组服务 */
export class FlowGroupService {
  @inject(EntityManager) public readonly entityManager: EntityManager;

  @inject(FlowOperationBaseService)
  public readonly operationService: FlowOperationBaseService;

  /** 创建分组节点 */
  public createGroup(nodes: FlowNodeEntity[]): FlowNodeEntity | undefined {
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return;
    }
    if (!FlowGroupUtils.validate(nodes)) {
      return;
    }
    const sortedNodes: FlowNodeEntity[] = nodes.sort((a, b) => a.index - b.index);
    const fromNode = sortedNodes[0];
    const groupId = `group_${nanoid(5)}`;
    this.operationService.apply({
      type: OperationType.createGroup,
      value: {
        targetId: fromNode.id,
        groupId,
        nodeIds: nodes.map((node) => node.id),
      },
    });
    const groupNode = this.entityManager.getEntityById<FlowNodeEntity>(groupId);
    if (!groupNode) {
      return;
    }
    const group = this.groupController(groupNode);
    if (!group) {
      return;
    }
    group.expand();
    return groupNode;
  }

  /** 删除分组 */
  public deleteGroup(groupNode: FlowNodeEntity): void {
    const json = groupNode.toJSON();
    if (!groupNode.pre || !json) {
      return;
    }
    this.operationService.apply({
      type: OperationType.deleteNodes,
      value: {
        fromId: groupNode.pre.id,
        nodes: [json],
      },
    });
  }

  /** 取消分组 */
  public ungroup(groupNode: FlowNodeEntity): void {
    const group = this.groupController(groupNode);
    if (!group) {
      return;
    }
    const nodes = group.nodes;
    if (!groupNode.pre) {
      return;
    }
    group.collapse();
    this.operationService.apply({
      type: OperationType.ungroup,
      value: {
        groupId: groupNode.id,
        targetId: groupNode.pre.id,
        nodeIds: nodes.map((node) => node.id),
      },
    });
  }

  /** 返回所有分组节点 */
  public getAllGroups(): FlowGroupController[] {
    const allNodes = this.entityManager.getEntities<FlowNodeEntity>(FlowNodeEntity);
    const groupNodes = allNodes.filter((node) => node.flowNodeType === FlowNodeBaseType.GROUP);
    return groupNodes
      .map((node) => this.groupController(node))
      .filter(Boolean) as FlowGroupController[];
  }

  /** 获取分组控制器*/
  public groupController(group: FlowNodeEntity): FlowGroupController | undefined {
    return FlowGroupController.create(group);
  }

  public static validate(nodes: FlowNodeEntity[]): boolean {
    return FlowGroupUtils.validate(nodes);
  }
}
