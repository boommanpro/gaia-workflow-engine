/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable, postConstruct } from 'inversify';
import { PlaygroundConfigEntity } from '@flowgram.ai/core';
import { EntityManager } from '@flowgram.ai/core';
import { DisposableCollection, Emitter, type IPoint } from '@flowgram.ai/utils';

import { WorkflowDocument } from '../workflow-document';
import { layoutToPositions } from '../utils/layout-to-positions';
import { fitView } from '../utils';
import { WorkflowNodeEntity } from '../entities';

export type PositionMap = Record<string, IPoint>;

/**
 * 重置布局服务
 */
@injectable()
export class WorkflowResetLayoutService {
  @inject(PlaygroundConfigEntity)
  private _config: PlaygroundConfigEntity;

  @inject(WorkflowDocument)
  private _document: WorkflowDocument;

  @inject(EntityManager)
  private _entityManager: EntityManager;

  private _resetLayoutEmitter = new Emitter<{
    nodeIds: string[];
    positionMap: PositionMap;
    oldPositionMap: PositionMap;
  }>();

  /**
   * reset layout事件
   */
  readonly onResetLayout = this._resetLayoutEmitter.event;

  private _toDispose = new DisposableCollection();

  /**
   * 初始化
   */
  @postConstruct()
  init() {
    this._toDispose.push(this._resetLayoutEmitter);
  }

  /**
   * 触发重置布局
   * @param nodeIds 节点id
   * @param positionMap 新布局数据
   * @param oldPositionMap 老布局数据
   */
  fireResetLayout(nodeIds: string[], positionMap: PositionMap, oldPositionMap: PositionMap) {
    this._resetLayoutEmitter.fire({
      nodeIds,
      positionMap,
      oldPositionMap,
    });
  }

  /**
   * 根据数据重新布局
   * @param positionMap
   * @returns
   */
  async layoutToPositions(nodeIds: string[], positionMap: PositionMap) {
    const nodes = nodeIds
      .map(id => this._entityManager.getEntityById(id))
      .filter(Boolean) as WorkflowNodeEntity[];
    const positions = await layoutToPositions(nodes, positionMap);
    fitView(this._document, this._config, true);
    return positions;
  }

  /**
   * 销毁
   */
  dispose() {
    this._toDispose.dispose();
  }
}
