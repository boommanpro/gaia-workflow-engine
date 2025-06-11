import { Event, type Rectangle } from '@flowgram.ai/utils';
import { Entity, type EntityOpts } from '@flowgram.ai/core';

import {
  FlowLayoutDefault,
  FlowNodeJSON,
  FlowNodeMeta,
  FlowNodeRegistry,
  FlowNodeType,
} from '../typings';
import type { FlowDocument } from '../flow-document';
import { FlowNodeRenderData, FlowNodeTransformData } from '../datas';

export interface FlowNodeEntityConfig extends EntityOpts {
  document: FlowDocument;
  flowNodeType: FlowNodeType;
  originParent?: FlowNodeEntity;
  meta?: FlowNodeMeta;
}

export interface FlowNodeInitData {
  originParent?: FlowNodeEntity;
  parent?: FlowNodeEntity;
  hidden?: boolean;
  meta?: FlowNodeMeta;
  index?: number;
}

export class FlowNodeEntity extends Entity<FlowNodeEntityConfig> {
  private _memoLocalCache = new Map<string, any>();

  private _memoGlobalCache = new Map<string, any>();

  static type = 'FlowNodeEntity';

  private _registerCache?: FlowNodeRegistry;

  private _metaCache?: Required<FlowNodeMeta>;

  metaFromJSON?: FlowNodeMeta;

  /**
   * 真实的父节点，条件块在内部会创建一些空的块节点，这些块需要关联它真实的父亲节点
   */
  originParent?: FlowNodeEntity;

  flowNodeType: FlowNodeType = 'unknown'; // 流程类型

  /**
   * 是否隐藏
   */
  private _hidden = false;

  index = -1;

  /**
   * 文档引用
   */
  document: FlowDocument;

  constructor(conf: FlowNodeEntityConfig) {
    super(conf);
    this.document = conf.document;
    this.flowNodeType = conf.flowNodeType;
    this.originParent = conf.originParent;
    this.metaFromJSON = conf.meta;
    this.onDispose(() => {
      this.document.originTree
        .getChildren(this)
        .slice()
        .forEach((child) => {
          child.dispose();
        });
      this.document.originTree.remove(this, false);
      this.originParent = undefined;
    });
  }

  initData(initConf: FlowNodeInitData): void {
    if (initConf.originParent !== this.originParent) {
      this.originParent = initConf.originParent;
      this._registerCache = undefined;
    }
    if (initConf.parent) {
      initConf.parent.addChild(this, initConf.index);
    }
    // TODO 这个 meta 不会触发 data 数据更新
    if (initConf.meta !== this.metaFromJSON) {
      this._metaCache = undefined;
      this.metaFromJSON = initConf.meta;
    }
    this._hidden = !!(this.getNodeMeta().hidden || initConf.hidden);
  }

  get isStart(): boolean {
    return this.getNodeMeta().isStart;
  }

  get isFirst(): boolean {
    return !this.pre;
  }

  get isLast(): boolean {
    return !this.next;
  }

  /**
   * 子节点采用水平布局
   */
  get isInlineBlocks(): boolean {
    const originIsInlineBlocks = this.getNodeMeta().isInlineBlocks;
    return typeof originIsInlineBlocks === 'function'
      ? originIsInlineBlocks(this)
      : originIsInlineBlocks;
  }

  /**
   * 水平节点
   */
  get isInlineBlock(): boolean {
    const parent = this.document.renderTree.getParent(this);
    return !!(parent && parent.isInlineBlocks);
  }

  /**
   * 节点结束标记
   * - 当前节点是结束节点
   * - 当前节点最后一个节点包含结束标记
   * - 当前节点为 inlineBlock，每一个 block 包含结束标记
   *
   * 由子元素确定，因此使用 memoLocal
   */
  get isNodeEnd(): boolean {
    return this.memoLocal<boolean>('isNodeEnd', () => {
      if (this.getNodeMeta().isNodeEnd) {
        return true;
      }

      if (this.isInlineBlocks && this.collapsedChildren.length) {
        return this.collapsedChildren.every((child) => child.isNodeEnd);
      }

      if (this.lastCollapsedChild) {
        return this.lastCollapsedChild.isNodeEnd;
      }

      return false;
    });
  }

  /**
   * 添加 子节点
   *
   * @param child 插入节点
   */
  addChild(child: FlowNodeEntity, index?: number) {
    if (child.parent === this) return;
    this.document.originTree.addChild(this, child, index);
  }

  get hasChild(): boolean {
    return this.children.length > 0;
  }

  get pre(): FlowNodeEntity | undefined {
    return this.document.renderTree.getPre(this);
  }

  get next(): FlowNodeEntity | undefined {
    return this.document.renderTree.getNext(this);
  }

  get parent(): FlowNodeEntity | undefined {
    return this.document.renderTree.getParent(this);
  }

  getNodeRegistry<M extends FlowNodeRegistry = FlowNodeRegistry & { meta: FlowNodeMeta }>(): M {
    if (this._registerCache) return this._registerCache as M;
    this._registerCache = this.document.getNodeRegistry(this.flowNodeType, this.originParent);
    return this._registerCache as M;
  }

  /**
   * @deprecated
   * use getNodeRegistry instead
   */
  getNodeRegister<M extends FlowNodeRegistry = FlowNodeRegistry>(): M {
    return this.getNodeRegistry<M>();
  }

  getNodeMeta<M extends FlowNodeMeta = FlowNodeMeta>(): M & Required<FlowNodeMeta> {
    if (this._metaCache) return this._metaCache as M & Required<FlowNodeMeta>;
    if (this.metaFromJSON) {
      this._metaCache = {
        ...this.getNodeRegistry().meta,
        ...this.metaFromJSON,
      } as M & Required<FlowNodeMeta>;
    } else {
      this._metaCache = this.getNodeRegistry().meta as M & Required<FlowNodeMeta>;
    }
    return this._metaCache as M & Required<FlowNodeMeta>;
  }

  /**
   * 获取所有子节点，包含 child 及其所有兄弟节点
   */
  get allChildren(): FlowNodeEntity[] {
    const children: FlowNodeEntity[] = [];
    for (const child of this.children) {
      children.push(child);
      children.push(...child.allChildren);
    }
    return children;
  }

  /**
   * 获取所有收起的子节点，包含 child 及其所有兄弟节点
   */
  get allCollapsedChildren(): FlowNodeEntity[] {
    const children: FlowNodeEntity[] = [];
    for (const child of this.collapsedChildren) {
      children.push(child);
      children.push(...child.allCollapsedChildren);
    }
    return children;
  }

  /**
   *
   * Get child blocks
   *
   * use `blocks` instead
   * @deprecated
   */

  get collapsedChildren(): FlowNodeEntity[] {
    return this.document.renderTree.getCollapsedChildren(this);
  }

  /**
   * Get child blocks
   */
  get blocks(): FlowNodeEntity[] {
    return this.collapsedChildren;
  }

  /**
   * Get last block
   */
  get lastBlock(): FlowNodeEntity | undefined {
    return this.lastCollapsedChild;
  }

  /**
   * use `lastBlock` instead
   */
  get lastCollapsedChild(): FlowNodeEntity | undefined {
    const { collapsedChildren } = this;
    return collapsedChildren[collapsedChildren.length - 1];
  }

  /**
   * 获取子节点，如果子节点收起来，则会返回 空数组
   */
  get children(): FlowNodeEntity[] {
    return this.document.renderTree.getChildren(this);
  }

  get lastChild(): FlowNodeEntity | undefined {
    const { children } = this;
    return children[children.length - 1];
  }

  get firstChild(): FlowNodeEntity | undefined {
    return this.children[0];
  }

  memoLocal<T>(key: string, fn: () => T): T {
    if (this._memoLocalCache.has(key)) {
      return this._memoLocalCache.get(key) as T;
    }
    const data = fn();
    this._memoLocalCache.set(key, data);
    return data as T;
  }

  memoGlobal<T>(key: string, fn: () => T): T {
    if (this._memoGlobalCache.has(key)) {
      return this._memoGlobalCache.get(key) as T;
    }
    const data = fn();
    this._memoGlobalCache.set(key, data);
    return data as T;
  }

  clearMemoGlobal() {
    this._memoGlobalCache.clear();
  }

  clearMemoLocal() {
    this._memoLocalCache.clear();
  }

  get childrenLength() {
    return this.children.length;
  }

  get collapsed(): boolean {
    if (this.document.renderTree.isCollapsed(this)) return true;
    return !!this.parent?.collapsed;
  }

  set collapsed(collapsed) {
    this.document.renderTree.setCollapsed(this, collapsed);
    this.clearMemoGlobal();
    this.clearMemoLocal();
  }

  get hidden(): boolean {
    return this._hidden;
  }

  // 展开该节点
  openInsideCollapsed() {
    this.document.renderTree.openNodeInsideCollapsed(this);
  }

  /**
   * 可以重载
   */
  getJSONData(): any {
    return this.getExtInfo();
  }

  /**
   * 生成 JSON
   * @param newId
   */
  toJSON(): FlowNodeJSON {
    if (this.document.options.toNodeJSON) {
      return this.document.options.toNodeJSON(this);
    }
    const nodesMap: Record<string, FlowNodeJSON> = {};
    let startNodeJSON: FlowNodeJSON;
    this.document.traverse((node) => {
      const isSystemNode = node.id.startsWith('$');
      if (isSystemNode) return;
      const nodeJSONData = this.getJSONData();
      const nodeJSON: FlowNodeJSON = {
        id: node.id,
        type: node.flowNodeType,
      };
      if (nodeJSONData !== undefined) {
        nodeJSON.data = nodeJSONData;
      }
      if (!startNodeJSON) startNodeJSON = nodeJSON;
      let { parent } = node;
      if (parent && parent.id.startsWith('$')) {
        parent = parent.originParent;
      }
      const parentJSON = parent ? nodesMap[parent.id] : undefined;
      if (parentJSON) {
        if (!parentJSON.blocks) {
          parentJSON.blocks = [];
        }
        parentJSON.blocks.push(nodeJSON);
      }
      nodesMap[node.id] = nodeJSON;
    }, this);
    return startNodeJSON!;
  }

  get isVertical(): boolean {
    return this.document.layout.name === FlowLayoutDefault.VERTICAL_FIXED_LAYOUT;
  }

  /**
   * 修改节点扩展信息
   * @param info
   */
  updateExtInfo<T extends Record<string, any> = Record<string, any>>(extInfo: T): void {
    this.getData(FlowNodeRenderData).updateExtInfo(extInfo);
  }

  /**
   * 获取节点扩展信息
   */
  getExtInfo<T extends Record<string, any> = Record<string, any>>(): T {
    return this.getData<FlowNodeRenderData>(FlowNodeRenderData).getExtInfo() as T;
  }

  get onExtInfoChange(): Event<{ newInfo: any; oldInfo: any }> {
    return this.renderData.onExtInfoChange;
  }

  /**
   * 获取渲染数据
   */
  get renderData(): FlowNodeRenderData {
    return this.getData(FlowNodeRenderData);
  }

  /**
   * 获取位置大小数据
   */
  get transform(): FlowNodeTransformData {
    return this.getData(FlowNodeTransformData);
  }

  /**
   * 获取节点的位置及大小矩形
   */
  get bounds(): Rectangle {
    return this.transform.bounds;
  }
}

export namespace FlowNodeEntity {
  export function is(obj: Entity): obj is FlowNodeEntity {
    return obj instanceof FlowNodeEntity;
  }
}
