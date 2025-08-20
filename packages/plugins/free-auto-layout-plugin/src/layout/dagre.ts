import { FlowNodeTransformData } from '@flowgram.ai/document';
import { Graph as DagreGraph } from '@dagrejs/graphlib';

import { dagreLib } from '../dagre-lib/index';
import { DagreNode, LayoutNode } from './type';
import { LayoutStore } from './store';

export class DagreLayout {
  private readonly graph: DagreGraph;

  constructor(private readonly store: LayoutStore) {
    this.graph = this.createGraph();
  }

  public layout(): void {
    this.graphSetData();
    this.dagreLayout();
    this.layoutSetPosition();
  }

  private dagreLayout(): void {
    let layoutGraph = dagreLib.buildLayoutGraph(this.graph);
    this.runLayout(layoutGraph);
    dagreLib.updateInputGraph(this.graph, layoutGraph);
  }

  private runLayout(graph: DagreGraph): void {
    dagreLib.makeSpaceForEdgeLabels(graph);
    dagreLib.removeSelfEdges(graph);
    dagreLib.acyclic.run(graph);
    dagreLib.nestingGraph.run(graph);
    dagreLib.rank(dagreLib.util.asNonCompoundGraph(graph));
    dagreLib.injectEdgeLabelProxies(graph);
    dagreLib.removeEmptyRanks(graph);
    dagreLib.nestingGraph.cleanup(graph);
    dagreLib.normalizeRanks(graph);
    dagreLib.assignRankMinMax(graph);
    dagreLib.removeEdgeLabelProxies(graph);
    dagreLib.normalize.run(graph);
    dagreLib.parentDummyChains(graph);
    dagreLib.addBorderSegments(graph);
    dagreLib.order(graph);
    this.setOrderAndRank(graph);
    dagreLib.insertSelfEdges(graph);
    dagreLib.coordinateSystem.adjust(graph);
    dagreLib.position(graph);
    dagreLib.positionSelfEdges(graph);
    dagreLib.removeBorderNodes(graph);
    dagreLib.normalize.undo(graph);
    dagreLib.fixupEdgeLabelCoords(graph);
    dagreLib.coordinateSystem.undo(graph);
    dagreLib.translateGraph(graph);
    dagreLib.assignNodeIntersects(graph);
    dagreLib.reversePointsForReversedEdges(graph);
    dagreLib.acyclic.undo(graph);
  }

  private createGraph(): DagreGraph {
    const graph = new DagreGraph({ multigraph: true });
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph(this.store.config);
    return graph;
  }

  private graphSetData(): void {
    const nodes = Array.from(this.store.nodes.values());
    const edges = Array.from(this.store.edges.values()).sort((next, prev) => {
      if (next.fromIndex === prev.fromIndex) {
        return next.toIndex! < prev.toIndex! ? -1 : 1;
      }
      return next.fromIndex < prev.fromIndex ? -1 : 1;
    });
    nodes.forEach((layoutNode) => {
      this.graph.setNode(layoutNode.index, {
        originID: layoutNode.id,
        width: layoutNode.size.width,
        height: layoutNode.size.height,
      });
    });
    edges.forEach((layoutEdge) => {
      this.graph.setEdge({
        v: layoutEdge.fromIndex,
        w: layoutEdge.toIndex,
        name: layoutEdge.name,
      });
    });
  }

  private layoutSetPosition(): void {
    this.store.nodes.forEach((layoutNode) => {
      const offsetX = this.getOffsetX(layoutNode);
      const graphNode = this.graph.node(layoutNode.index);
      if (!graphNode) {
        // 异常兜底，一般不会出现
        layoutNode.rank = -1;
        layoutNode.position = {
          x: layoutNode.position.x + offsetX,
          y: layoutNode.position.y,
        };
        return;
      }
      layoutNode.rank = graphNode.rank ?? -1;
      layoutNode.position = {
        x: this.normalizeNumber(graphNode.x) + offsetX,
        y: this.normalizeNumber(graphNode.y),
      };
    });
  }

  private normalizeNumber(number: number): number {
    // NaN 转为 0，异常兜底，一般不会出现
    return Number.isNaN(number) ? 0 : number;
  }

  private getOffsetX(layoutNode: LayoutNode): number {
    if (!layoutNode.hasChildren) {
      return 0;
    }
    // 存在子节点才需计算padding带来的偏移
    const nodeTransform = layoutNode.entity.getData(FlowNodeTransformData);
    const { bounds, padding } = nodeTransform;
    const leftOffset = -bounds.width / 2 + padding.left;
    return leftOffset;
  }

  private setOrderAndRank(g: DagreGraph): DagreGraph {
    // 跟随调整
    this.followAdjust(g);
    // 重新排序
    this.normalizeOrder(g);
    return g;
  }

  /** 跟随调整 */
  private followAdjust(g: DagreGraph): void {
    const rankGroup = this.rankGroup(g);
    g.nodes().forEach((i) => {
      const graphNode: DagreNode = g.node(i);
      const layoutNode = this.store.getNodeByIndex(i);

      // 没有跟随节点，则不调整
      if (!graphNode || !layoutNode?.followedBy) return;
      const { followedBy } = layoutNode;
      const { rank: targetRank, order: targetOrder } = graphNode;

      // 跟随节点索引
      const followIndexes = followedBy
        .map((id) => this.store.getNode(id)?.index)
        .filter(Boolean) as string[];
      const followSet = new Set(followIndexes);

      // 目标节点之后的节点
      const rankIndexes = rankGroup.get(targetRank);
      if (!rankIndexes) return;
      const afterIndexes = Array.from(rankIndexes).filter((index) => {
        if (followSet.has(index)) return false;
        const graphNode = g.node(index);
        return graphNode.order > targetOrder;
      });

      // 目标节点之后的节点 order 增加跟随节点数量
      afterIndexes.forEach((index) => {
        const graphNode = g.node(index);
        graphNode.order = graphNode.order + followedBy.length;
      });

      // 跟随节点 order 增加
      followIndexes.forEach((followIndex, index) => {
        const graphNode = g.node(followIndex);
        graphNode.order = targetOrder + index + 1;
        // 更新 rank 分组缓存
        const originRank = graphNode.rank;
        graphNode.rank = targetRank;
        rankGroup.get(originRank)?.delete(followIndex);
        rankGroup.get(targetRank)?.add(followIndex);
      });
    });
  }

  /** rank 内 order 可能不连续，需要重新排序 */
  private normalizeOrder(g: DagreGraph): void {
    const rankGroup = this.rankGroup(g);
    rankGroup.forEach((indexSet, rank) => {
      const graphNodes: DagreNode[] = Array.from(indexSet).map((id) => g.node(id));
      graphNodes.sort((a, b) => a.order - b.order);
      graphNodes.forEach((node, index) => {
        node.order = index;
      });
    });
  }

  /** 获取 rank 分组 */
  private rankGroup(g: DagreGraph): Map<number, Set<string>> {
    const rankGroup = new Map<number, Set<string>>();
    g.nodes().forEach((i) => {
      const graphNode = g.node(i);
      const rank = graphNode.rank;
      if (!rankGroup.has(rank)) {
        rankGroup.set(rank, new Set());
      }
      rankGroup.get(rank)?.add(i);
    });
    return rankGroup;
  }
}
