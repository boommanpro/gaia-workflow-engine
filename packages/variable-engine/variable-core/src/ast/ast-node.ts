/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  BehaviorSubject,
  animationFrameScheduler,
  debounceTime,
  distinctUntilChanged,
  map,
  skip,
  tap,
} from 'rxjs';
import { nanoid } from 'nanoid';
import { shallowEqual } from 'fast-equals';
import { Disposable, DisposableCollection } from '@flowgram.ai/utils';

import { subsToDisposable } from '../utils/toDisposable';
import { updateChildNodeHelper } from './utils/helpers';
import { type Scope } from '../scope';
import {
  type ASTNodeJSON,
  type ObserverOrNext,
  type ASTKindType,
  type CreateASTParams,
  type Identifier,
  SubscribeConfig,
  GlobalEventActionType,
  DisposeASTAction,
  UpdateASTAction,
} from './types';
import { ASTNodeFlags } from './flags';

export interface ASTNodeRegistry<JSON extends ASTNodeJSON = any, InjectOpts = any> {
  kind: string;
  new (params: CreateASTParams, injectOpts: InjectOpts): ASTNode<JSON>;
}

export abstract class ASTNode<JSON extends ASTNodeJSON = any, InjectOpts = any>
  implements Disposable
{
  /**
   * @deprecated
   * 获取 ASTNode 注入的 opts
   *
   * 请使用 @injectToAst(XXXService) declare xxxService: XXXService 实现外部依赖注入
   */
  public readonly opts?: InjectOpts;

  /**
   * 节点的唯一标识符，节点不指定则默认由 nanoid 生成，不可更改
   * - 如需要生成新 key，则销毁当前节点并生成新的节点
   */
  public readonly key: Identifier;

  /**
   * 节点类型
   */
  static readonly kind: ASTKindType;

  /**
   * 节点 Flags，记录一些 Flag 信息
   */
  public readonly flags: number = ASTNodeFlags.None;

  /**
   * 节点所处的作用域
   */
  public readonly scope: Scope;

  /**
   * 父节点
   */
  public readonly parent: ASTNode | undefined;

  /**
   * 节点的版本号，每 fireChange 一次 version + 1
   */
  protected _version: number = 0;

  /**
   * 更新锁
   */
  public changeLocked = false;

  /**
   * Batch Update 相关参数
   */
  private _batch: {
    batching: boolean;
    hasChangesInBatch: boolean;
  } = {
    batching: false,
    hasChangesInBatch: false,
  };

  /**
   * AST 节点变化事件，基于 Rxjs 实现
   * - 使用了 BehaviorSubject, 在订阅时会自动触发一次事件，事件为当前值
   */
  public readonly value$: BehaviorSubject<ASTNode> = new BehaviorSubject<ASTNode>(this as ASTNode);

  /**
   * 子节点
   */
  protected _children = new Set<ASTNode>();

  /**
   * 删除节点处理事件列表
   */
  public readonly toDispose: DisposableCollection = new DisposableCollection(
    Disposable.create(() => {
      // 子元素删除时，父元素触发更新
      this.parent?.fireChange();
      this.children.forEach((child) => child.dispose());
    })
  );

  /**
   * 销毁时触发的回调
   */
  onDispose = this.toDispose.onDispose;

  /**
   * 构造函数
   * @param createParams 创建 ASTNode 的必要参数
   * @param injectOptions 依赖注入各种模块
   */
  constructor({ key, parent, scope }: CreateASTParams, opts?: InjectOpts) {
    this.scope = scope;
    this.parent = parent;
    this.opts = opts;

    // 初始化 key 值，如果有传入 key 按照传入的来，否则按照 nanoid 随机生成
    this.key = key || nanoid();

    // 后续调用 fromJSON 内的所有 fireChange 合并成一个
    this.fromJSON = this.withBatchUpdate(this.fromJSON.bind(this));
  }

  /**
   * AST 节点的类型
   */
  get kind(): string {
    if (!(this.constructor as any).kind) {
      throw new Error(`ASTNode Registry need a kind: ${this.constructor.name}`);
    }
    return (this.constructor as any).kind;
  }

  /**
   * 解析 AST JSON 数据
   * @param json AST JSON 数据
   */
  abstract fromJSON(json: JSON): void;

  /**
   * 获取当前节点所有子节点
   */
  get children(): ASTNode[] {
    return Array.from(this._children);
  }

  /**
   * 转化为 ASTNodeJSON
   * @returns
   */
  toJSON(): ASTNodeJSON {
    // 提示用户自己实现 ASTNode 的 toJSON，不要用兜底实现
    console.warn('[VariableEngine] Please Implement toJSON method for ' + this.kind);

    return {
      kind: this.kind,
    };
  }

  /**
   * 创建子节点
   * @param json 子节点的 AST JSON
   * @returns
   */
  protected createChildNode<ChildNode extends ASTNode = ASTNode>(json: ASTNodeJSON): ChildNode {
    const astRegisters = this.scope.variableEngine.astRegisters;

    const child = astRegisters.createAST(json, {
      parent: this,
      scope: this.scope,
    }) as ChildNode;

    // 加入 _children 集合
    this._children.add(child);
    child.toDispose.push(
      Disposable.create(() => {
        this._children.delete(child);
      })
    );

    return child;
  }

  /**
   * 更新子节点，快速实现子节点更新消费逻辑
   * @param keyInThis 当前对象上的指定 key
   */
  protected updateChildNodeByKey(keyInThis: keyof this, nextJSON?: ASTNodeJSON) {
    this.withBatchUpdate(updateChildNodeHelper).call(this, {
      getChildNode: () => this[keyInThis] as ASTNode,
      updateChildNode: (_node) => ((this as any)[keyInThis] = _node),
      removeChildNode: () => ((this as any)[keyInThis] = undefined),
      nextJSON,
    });
  }

  /**
   * 批处理更新，批处理函数内所有的 fireChange 都合并成一个
   * @param updater 批处理函数
   * @returns
   */
  protected withBatchUpdate<ParamTypes extends any[], ReturnType>(
    updater: (...args: ParamTypes) => ReturnType
  ) {
    return (...args: ParamTypes) => {
      // batchUpdate 里面套 batchUpdate 只能生效一次
      if (this._batch.batching) {
        return updater.call(this, ...args);
      }

      this._batch.hasChangesInBatch = false;

      this._batch.batching = true;
      const res = updater.call(this, ...args);
      this._batch.batching = false;

      if (this._batch.hasChangesInBatch) {
        this.fireChange();
      }
      this._batch.hasChangesInBatch = false;

      return res;
    };
  }

  /**
   * 触发当前节点更新
   */
  fireChange(): void {
    if (this.changeLocked || this.disposed) {
      return;
    }

    if (this._batch.batching) {
      this._batch.hasChangesInBatch = true;
      return;
    }

    this._version++;
    this.value$.next(this);
    this.dispatchGlobalEvent<UpdateASTAction>({ type: 'UpdateAST' });
    this.parent?.fireChange();
  }

  /**
   * 节点的版本值
   * - 通过 NodeA === NodeB && versionA === versionB 可以比较两者是否相等
   */
  get version(): number {
    return this._version;
  }

  /**
   * 节点唯一 hash 值
   */
  get hash(): string {
    return `${this._version}${this.kind}${this.key}`;
  }

  /**
   * 监听 AST 节点的变化
   * @param observer 监听回调
   * @param selector 监听指定数据
   * @returns
   */
  subscribe<Data = this>(
    observer: ObserverOrNext<Data>,
    { selector, debounceAnimation, triggerOnInit }: SubscribeConfig<this, Data> = {}
  ): Disposable {
    return subsToDisposable(
      this.value$
        .pipe(
          map(() => (selector ? selector(this) : (this as any))),
          distinctUntilChanged(
            (a, b) => shallowEqual(a, b),
            (value) => {
              if (value instanceof ASTNode) {
                // 如果 value 是 ASTNode，则进行 hash 的比较
                return value.hash;
              }
              return value;
            }
          ),
          // 默认跳过 BehaviorSubject 第一次触发
          triggerOnInit ? tap(() => null) : skip(1),
          // 每个 animationFrame 内所有更新合并成一个
          debounceAnimation ? debounceTime(0, animationFrameScheduler) : tap(() => null)
        )
        .subscribe(observer)
    );
  }

  dispatchGlobalEvent<ActionType extends GlobalEventActionType = GlobalEventActionType>(
    event: Omit<ActionType, 'ast'>
  ) {
    this.scope.event.dispatch({
      ...event,
      ast: this,
    });
  }

  /**
   * 销毁
   */
  dispose(): void {
    // 防止销毁多次
    if (this.toDispose.disposed) {
      return;
    }

    this.toDispose.dispose();
    this.dispatchGlobalEvent<DisposeASTAction>({ type: 'DisposeAST' });

    // complete 事件发出时，需要确保当前 ASTNode 为 disposed 状态
    this.value$.complete();
    this.value$.unsubscribe();
  }

  get disposed(): boolean {
    return this.toDispose.disposed;
  }

  /**
   * 节点扩展信息
   */
  [key: string]: unknown;
}
