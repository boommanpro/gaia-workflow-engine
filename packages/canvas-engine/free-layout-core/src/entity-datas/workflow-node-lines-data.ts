/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Disposable } from '@flowgram.ai/utils';
import { EntityData } from '@flowgram.ai/core';

import { type WorkflowLineEntity, type WorkflowNodeEntity } from '../entities';

export interface WorkflowNodeLines {
  inputLines: WorkflowLineEntity[];
  outputLines: WorkflowLineEntity[];
}

/**
 * 节点的关联的线条
 */
export class WorkflowNodeLinesData extends EntityData<WorkflowNodeLines> {
  static type = 'WorkflowNodeLinesData';

  entity: WorkflowNodeEntity;

  getDefaultData(): WorkflowNodeLines {
    return {
      inputLines: [],
      outputLines: [],
    };
  }

  constructor(entity: WorkflowNodeEntity) {
    super(entity);
    this.entity = entity;
    this.entity.preDispose.push(
      Disposable.create(() => {
        this.inputLines.slice().forEach((line) => line.dispose());
        this.outputLines.slice().forEach((line) => line.dispose());
      })
    );
  }

  /**
   * 输入线条
   */
  get inputLines(): WorkflowLineEntity[] {
    return this.data.inputLines;
  }

  /**
   * 输出线条
   */
  get outputLines(): WorkflowLineEntity[] {
    return this.data.outputLines;
  }

  get allLines(): WorkflowLineEntity[] {
    return this.data.inputLines.concat(this.data.outputLines);
  }

  get availableLines(): WorkflowLineEntity[] {
    return this.allLines.filter((line) => !line.isDrawing && !line.isHidden);
  }

  /**
   * 输入节点
   */
  get inputNodes(): WorkflowNodeEntity[] {
    return this.inputLines.map((l) => l.from!).filter(Boolean);
  }

  /**
   * 所有输入节点
   */
  get allInputNodes(): WorkflowNodeEntity[] {
    const nodeSet: Set<WorkflowNodeEntity> = new Set();

    const handleNode = (node: WorkflowNodeEntity): void => {
      if (nodeSet.has(node)) {
        return;
      }

      nodeSet.add(node);

      const { inputNodes } = node.getData<WorkflowNodeLinesData>(WorkflowNodeLinesData)!;
      if (!inputNodes || !inputNodes.length) {
        return;
      }

      inputNodes.forEach((inputNode: WorkflowNodeEntity) => {
        // 如果 outputNode 和当前 node 是父子节点，则不向下遍历
        if (inputNode?.parent === node || node?.parent === inputNode) {
          return;
        }
        handleNode(inputNode);
      });
    };

    handleNode(this.entity);
    nodeSet.delete(this.entity);

    return Array.from(nodeSet);
  }

  /**
   * 输出节点
   */
  get outputNodes(): WorkflowNodeEntity[] {
    return this.outputLines.map((l) => l.to!).filter(Boolean);
  }

  /**
   * 输入输出节点
   */
  get allOutputNodes(): WorkflowNodeEntity[] {
    const nodeSet: Set<WorkflowNodeEntity> = new Set();

    const handleNode = (node: WorkflowNodeEntity): void => {
      if (nodeSet.has(node)) {
        return;
      }

      nodeSet.add(node);

      const { outputNodes } = node.getData<WorkflowNodeLinesData>(WorkflowNodeLinesData)!;
      if (!outputNodes || !outputNodes.length) {
        return;
      }

      outputNodes.forEach((outputNode: WorkflowNodeEntity) => {
        // 如果 outputNode 和当前 node 是父子节点，则不向下遍历
        if (outputNode?.parent === node || node?.parent === outputNode) {
          return;
        }
        handleNode(outputNode);
      });
    };

    handleNode(this.entity);
    nodeSet.delete(this.entity);

    return Array.from(nodeSet);
  }

  addLine(line: WorkflowLineEntity): void {
    if (line.from === this.entity) {
      this.outputLines.push(line);
    } else {
      this.inputLines.push(line);
    }
    this.fireChange();
  }

  removeLine(line: WorkflowLineEntity): void {
    const { inputLines, outputLines } = this;
    const inputIndex = inputLines.indexOf(line);
    const outputIndex = outputLines.indexOf(line);
    if (inputIndex !== -1) {
      inputLines.splice(inputIndex, 1);
      this.fireChange();
    }
    if (outputIndex !== -1) {
      outputLines.splice(outputIndex, 1);
      this.fireChange();
    }
  }
}
