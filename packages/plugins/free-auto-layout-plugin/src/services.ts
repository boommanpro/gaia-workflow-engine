import { inject, injectable } from 'inversify';
import {
  WorkflowDocument,
  WorkflowLineEntity,
  WorkflowNodeEntity,
  WorkflowNodeLinesData,
} from '@flowgram.ai/free-layout-core';

import { AutoLayoutOptions } from './type';
import { LayoutConfig } from './layout/type';
import { DefaultLayoutConfig, Layout, type LayoutOptions } from './layout';

@injectable()
export class AutoLayoutService {
  @inject(WorkflowDocument) private readonly document: WorkflowDocument;

  private layoutConfig: LayoutConfig = DefaultLayoutConfig;

  public init(options: AutoLayoutOptions) {
    this.layoutConfig = {
      ...this.layoutConfig,
      ...options.layoutConfig,
    };
  }

  public async layout(options: LayoutOptions = {}): Promise<void> {
    await this.layoutNode(this.document.root, options);
  }

  private async layoutNode(node: WorkflowNodeEntity, options: LayoutOptions): Promise<void> {
    // 获取子节点
    const nodes = node.blocks;
    if (!nodes || !Array.isArray(nodes) || !nodes.length) {
      return;
    }

    // 获取子线条
    const edges = this.getNodesAllLines(nodes);

    // 先递归执行子节点 autoLayout
    await Promise.all(nodes.map(async (child) => this.layoutNode(child, options)));

    const layout = new Layout(this.layoutConfig);
    layout.init({ nodes, edges, container: node }, options);
    layout.layout();
    await layout.position();
  }

  private getNodesAllLines(nodes: WorkflowNodeEntity[]): WorkflowLineEntity[] {
    const lines = nodes
      .map((node) => {
        const linesData = node.getData<WorkflowNodeLinesData>(WorkflowNodeLinesData);
        const outputLines = linesData.outputLines.filter(Boolean);
        const inputLines = linesData.inputLines.filter(Boolean);
        return [...outputLines, ...inputLines];
      })
      .flat();

    return lines;
  }
}
