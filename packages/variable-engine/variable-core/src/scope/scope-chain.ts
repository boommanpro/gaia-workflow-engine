/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import { DisposableCollection, type Event } from '@flowgram.ai/utils';

import { VariableEngineProvider } from '../providers';
import { type Scope } from './scope';

/**
 * 作用域依赖关系管理数据结构
 * - ScopeOrder 可能存在多种实现方式，因此采取抽象类的方式，具体的实现由子类实现
 */
@injectable()
export abstract class ScopeChain {
  readonly toDispose: DisposableCollection = new DisposableCollection();

  @inject(VariableEngineProvider) variableEngineProvider: VariableEngineProvider;

  get variableEngine() {
    return this.variableEngineProvider();
  }

  constructor() {}

  /**
   * 所有作用域依赖关系刷新
   */
  refreshAllChange(): void {
    this.variableEngine.getAllScopes().forEach(_scope => {
      _scope.refreshCovers();
      _scope.refreshDeps();
    });
  }

  // 获取依赖作用域，子类实现
  abstract getDeps(scope: Scope): Scope[];

  // 获取覆盖作用域，子类实现
  abstract getCovers(scope: Scope): Scope[];

  // 获取所有作用域的排序
  abstract sortAll(): Scope[];

  dispose(): void {
    this.toDispose.dispose();
  }

  get disposed(): boolean {
    return this.toDispose.disposed;
  }

  get onDispose(): Event<void> {
    return this.toDispose.onDispose;
  }
}
