/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowDocumentConfigEnum, FlowNodeBaseType, FlowNodeSplitType } from './typings';
import { FlowVirtualTree } from './flow-virtual-tree';
import type { FlowDocument } from './flow-document';
import type { FlowNodeEntity } from './entities';

/**
 * Render Tree 会只读模式，不具备操作 tree 结构元素
 */
export class FlowRenderTree<T extends FlowNodeEntity> extends FlowVirtualTree<T> {
  protected originTree: FlowVirtualTree<T>;

  protected document: FlowDocument;

  /**
   * 折叠的节点
   * @protected
   */
  protected nodesCollapsed = new Set<T>();

  constructor(readonly root: T, originTree: FlowVirtualTree<T>, document: FlowDocument) {
    super(root);
    this.originTree = originTree;
    this.onTreeChange = this.originTree.onTreeChange;
    this.document = document;
  }

  isCollapsed(node: T): boolean {
    return this.nodesCollapsed.has(node);
  }

  get collapsedNodeList(): T[] {
    return Array.from(this.nodesCollapsed);
  }

  /**
   * 折叠元素
   * @param node
   * @param collapsed
   */
  setCollapsed(node: T, collapsed: boolean): void {
    if (collapsed) {
      this.nodesCollapsed.add(node);
    } else {
      this.nodesCollapsed.delete(node);
    }
    this.originTree.fireTreeChange();
  }

  /**
   *
   */
  openNodeInsideCollapsed(node: T) {
    // 找到所有的originTree上的parent
    let curr: T | undefined = this.originTree.getInfo(node)?.parent;

    while (curr) {
      if (this.nodesCollapsed.has(curr)) {
        this.nodesCollapsed.delete(curr);
      }
      const { parent } = this.originTree.getInfo(curr) || {};
      curr = parent;
    }
    this.originTree.fireTreeChange();
  }

  /**
   * 更新结束节点等位置信息，分支里如果全是结束节点则要做相应的偏移
   */
  updateRenderStruct(): void {
    this.map = this.originTree.cloneMap();

    // 结束节点位置更新逻辑开关
    if (this.document.config.get(FlowDocumentConfigEnum.END_NODES_REFINE_BRANCH)) {
      this.refineBranch(this.root);
    }

    // 节点展开收起
    this.hideCollapsed();
  }

  /**
   * 隐藏收起节点
   */
  protected hideCollapsed() {
    this.nodesCollapsed.forEach(collapsedNode => {
      const collapsedNodeInfo = this.getInfo(collapsedNode);
      if (!collapsedNodeInfo) {
        // 自动回收节点数据
        this.nodesCollapsed.delete(collapsedNode);
        return;
      }

      const iconChild = collapsedNodeInfo.children.find(
        _child =>
          _child.flowNodeType === FlowNodeBaseType.BLOCK_ICON ||
          _child.flowNodeType === FlowNodeBaseType.BLOCK_ORDER_ICON,
      );

      // ⚠️注意：BLOCK_ICON 和 BLOCK_ORDER_ICON 作为一个 block 的标识节点，收起时需要保留
      if (iconChild) {
        const iconInfo = this.getInfo(iconChild);
        iconInfo.next = undefined;
        iconInfo.pre = undefined;
        collapsedNodeInfo.children = [iconChild];

        return;
      }

      // 收起节点children置为空
      collapsedNodeInfo.children = [];
    });
  }

  // 节点是否为结束节点
  isNodeEnd(node: T): boolean {
    if (node.getNodeMeta().isNodeEnd) {
      return true;
    }
    const { children } = this.getInfo(node);

    if (children.length > 0 && node.isInlineBlocks) {
      return children.every(child => this.isNodeEnd(child));
    }

    if (node.isInlineBlock) {
      return this.isNodeEnd(children[children.length - 1]);
    }

    return false;
  }

  /**
   * 优化精简分支线
   * - 结束节点拉直分支线
   */
  protected refineBranch(block: T) {
    let curr: T | undefined = this.getInfo(block).children[0];

    while (curr) {
      if (
        curr.flowNodeType === FlowNodeSplitType.DYNAMIC_SPLIT ||
        curr.flowNodeType === FlowNodeSplitType.STATIC_SPLIT
      ) {
        const { next, children: branchChildren } = this.getInfo(curr);
        const { children } = this.getInfo(branchChildren[1]);

        const passBlocks = (children || []).filter(child => !this.isNodeEnd(child));

        const shouldDragAllNextNodes = passBlocks.length === 1;
        if (shouldDragAllNextNodes && next) {
          this.dragNextNodesToBlock(passBlocks[0], next);
        }

        // 对每一个分支再进行refineBranch
        children?.forEach(child => {
          this.refineBranch(child);
        });

        if (shouldDragAllNextNodes) {
          break;
        }
      }

      curr = curr.next as T;
    }
  }

  // 结束节点拽分支，将后续节点拽到对应分支内
  protected dragNextNodesToBlock(toBlock: T, next: T) {
    const toBlockInfo = this.getInfo(toBlock);
    const nextInfo = this.getInfo(next);
    const toBlockLastChild = toBlockInfo.children[toBlock.children.length - 1];

    if (nextInfo.parent) {
      const nextParentInfo = this.getInfo(nextInfo.parent);

      // 1. next的节点和之前的节点断连
      if (nextInfo.pre) {
        this.getInfo(nextInfo.pre).next = undefined;
      }

      // 2. next连接到before上
      if (toBlockLastChild) {
        const lastChildInfo = this.getInfo(toBlockLastChild);
        lastChildInfo.next = next;
        nextInfo.pre = toBlockLastChild;
      }

      // 3. 获取所有后续节点, 将所有后续节点重新设置parent
      const nextNodeIndex = nextParentInfo.children.indexOf(next);
      const allNextNodes = nextParentInfo.children.slice(nextNodeIndex);
      nextParentInfo.children = nextParentInfo.children.slice(0, nextNodeIndex);
      for (const node of allNextNodes) {
        const nodeInfo = this.getInfo(node);
        toBlockInfo.children.push(node);
        nodeInfo.parent = toBlock;
      }
    }
  }

  getInfo(node: T): FlowVirtualTree.NodeInfo<T> {
    const info = this.map.get(node) || this.originTree.getInfo(node);
    return info;
  }

  // 或者originTree节点的信息
  getOriginInfo(node: T): FlowVirtualTree.NodeInfo<T> {
    return this.originTree.getInfo(node);
  }

  // 获取收起的隐藏节点
  getCollapsedChildren(node: T): T[] {
    return this.getOriginInfo(node).children || [];
  }

  remove(): void {
    throw new Error('Render Tree cannot use remove node');
  }

  addChild(): T {
    throw new Error('Render tree cannot use add child');
  }

  insertAfter(): void {
    throw new Error('Render tree cannot use insert after');
  }

  removeParent(): void {
    throw new Error('Render tree cannot use remove parent');
  }
}
