import { type Disposable, Emitter } from '@flowgram.ai/utils';

import { type FlowNodeType } from './typings';

/**
 * 存储节点的 tree 结构信息
 * 策略是 "重修改轻查询"，即修改时候做的事情更多，查询都通过指针来操作
 */
export class FlowVirtualTree<T extends { id: string; flowNodeType?: FlowNodeType }>
  implements Disposable
{
  protected onTreeChangeEmitter = new Emitter<void>();

  /**
   * tree 结构变化时候触发
   */
  onTreeChange = this.onTreeChangeEmitter.event;

  protected map: Map<T, FlowVirtualTree.NodeInfo<T>> = new Map();

  constructor(readonly root: T) {}

  dispose() {
    this.map.clear();
    this.onTreeChangeEmitter.dispose();
  }

  getInfo(node: T): FlowVirtualTree.NodeInfo<T> {
    let res: FlowVirtualTree.NodeInfo<T> | undefined = this.map.get(node);
    if (!res) {
      res = { children: [] };
      this.map.set(node, res);
    }
    return res;
  }

  clear(): void {
    this.map.clear();
  }

  cloneMap(): Map<T, FlowVirtualTree.NodeInfo<T>> {
    const newMap: Map<T, FlowVirtualTree.NodeInfo<T>> = new Map();
    for (const [key, value] of this.map) {
      newMap.set(key, {
        ...value,
        children: value.children.slice(),
      });
    }

    return newMap;
  }

  clone(): FlowVirtualTree<T> {
    const newTree = new FlowVirtualTree<T>(this.root);
    newTree.map = this.cloneMap();
    return newTree;
  }

  remove(node: T, withChildren = true): void {
    this.removeParent(node);
    if (withChildren) {
      this._removeChildren(node);
    }
    this.map.delete(node);
    this.fireTreeChange();
  }

  addChild(parent: T, child: T, index?: number): T {
    const parentInfo = this.getInfo(parent);
    const childInfo = this.getInfo(child);
    if (childInfo.parent) {
      if (childInfo.parent === parent) return child;
      if (childInfo.parent !== parent) {
        this.removeParent(child);
      }
    }

    const len = parentInfo.children.length;
    const idx = typeof index === 'undefined' ? len - 1 : index - 1;
    const lastChild = parentInfo.children[idx];
    const nextChild = parentInfo.children[idx + 1];
    if (lastChild) this.getInfo(lastChild).next = child;
    if (nextChild) this.getInfo(nextChild).pre = child;
    childInfo.pre = lastChild;
    childInfo.next = nextChild;
    parentInfo.children.splice(idx + 1, 0, child);
    childInfo.parent = parent;
    this.fireTreeChange();
    return child;
  }

  moveChilds(parent: T, childs: T[], index?: number): T[] {
    const parentInfo = this.getInfo(parent);
    const len = parentInfo.children.length;
    let childIndex: number = index ?? len;

    childs.forEach((child) => {
      const childInfo = this.getInfo(child);
      if (childInfo.parent) {
        this.removeParent(child);
      }
    });

    childs.forEach((child) => {
      const childInfo = this.getInfo(child);
      let lastChild: T | undefined = parentInfo.children[childIndex - 1];
      let nextChild: T | undefined = parentInfo.children[childIndex];

      if (lastChild) this.getInfo(lastChild).next = child;
      if (nextChild) this.getInfo(nextChild).pre = child;
      childInfo.pre = lastChild;
      childInfo.next = nextChild;
      parentInfo.children.splice(childIndex, 0, child);
      childInfo.parent = parent;
      childIndex++;
    });

    this.fireTreeChange();
    return childs;
  }

  getById(id: string): T | undefined {
    for (const node of this.map.keys()) {
      if (node.id === id) return node;
    }
  }

  /**
   * 插入节点到后边
   * @param before
   * @param after
   */
  insertAfter(before: T, after: T) {
    const beforeInfo = this.getInfo(before);
    const afterInfo = this.getInfo(after);
    this.removeParent(after);
    if (beforeInfo.parent) {
      const parentInfo = this.getInfo(beforeInfo.parent);
      parentInfo.children.splice(parentInfo.children.indexOf(before) + 1, 0, after);
      const { next } = beforeInfo;
      if (next) {
        this.getInfo(next).pre = after;
      }
      afterInfo.next = next;
      beforeInfo.next = after;
      afterInfo.pre = before;
      afterInfo.parent = beforeInfo.parent;
    }
    this.fireTreeChange();
  }

  removeParent(node: T): void {
    const info = this.getInfo(node);
    if (!info.parent) return;
    const parentInfo = this.getInfo(info.parent);
    const index = parentInfo.children.indexOf(node);
    parentInfo.children.splice(index, 1);
    const { pre, next } = info;
    if (pre) this.getInfo(pre).next = next;
    if (next) this.getInfo(next).pre = pre;
    this.fireTreeChange();
  }

  private _removeChildren(node: T): void {
    // 删除子节点
    const children = this.getChildren(node);
    if (children.length > 0) {
      children.forEach((child) => {
        this._removeChildren(child);
        this.map.delete(child);
      });
    }
  }

  getParent(node: T): T | undefined {
    return this.getInfo(node).parent;
  }

  getPre(node: T): T | undefined {
    return this.getInfo(node).pre;
  }

  getNext(node: T): T | undefined {
    return this.getInfo(node).next;
  }

  getChildren(node: T): T[] {
    return this.getInfo(node).children;
  }

  traverse(
    fn: (node: T, depth: number, index: number) => boolean | void,
    node = this.root,
    depth = 0,
    index = 0
  ): boolean | void {
    const breaked = fn(node, depth, index);
    if (breaked) return true;
    const info = this.getInfo(node);
    const shouldBreak = info.children.find((child, i) => this.traverse(fn, child, depth + 1, i));
    if (shouldBreak) return true;
  }

  /**
   * 通知文档树结构更新
   */
  fireTreeChange(): void {
    this.onTreeChangeEmitter.fire();
  }

  get size(): number {
    return this.map.size;
  }

  toString(showType?: boolean): string {
    const ret: string[] = [];
    this.traverse((node, depth) => {
      if (depth === 0) {
        ret.push(node.id);
      } else {
        ret.push(
          `|${new Array(depth).fill('--').join('')} ${
            showType ? `${node.flowNodeType}(${node.id})` : node.id
          }`
        );
      }
    });
    return `${ret.join('\n')}`;
  }
}

export namespace FlowVirtualTree {
  export interface NodeInfo<T> {
    parent?: T;
    next?: T;
    pre?: T;
    children: T[];
  }
}
