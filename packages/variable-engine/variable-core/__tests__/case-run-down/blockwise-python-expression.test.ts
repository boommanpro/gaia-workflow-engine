/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, test } from 'vitest';
import { isEqual } from 'lodash-es';
import { Container, injectable } from 'inversify';
import { Emitter } from '@flowgram.ai/utils';

import { CreateASTParams } from '../../src/ast/types';
import {
  ASTFactory,
  BaseExpression,
  BaseType,
  VariableDeclaration,
  VariableEngine,
  injectToAST,
} from '../../src';
import { getContainer } from '../../__mocks__/container';

interface PyExpressionJSON {
  content: string;
  uri: string;
}

const delay = (timeout: number) => new Promise((resolve) => setTimeout(resolve, timeout));

describe('Case Run Down: Python Expression In Blockwise', () => {
  @injectable()
  class PythonService {
    // 模拟 Blockwise 表达式后端存储推导的信息
    uriToType: Record<string, any> = {
      'blockwise://expression/a': { kind: 'String' },
      'blockwise://expression/b': { kind: 'Number' },
    };

    // 模拟 Blockwise 单表达式推导函数
    async infer(json: PyExpressionJSON) {
      return Promise.resolve(this.uriToType[json.uri]);
    }

    // 模拟表达式后端重新推导表达式
    batchInferEmitter = new Emitter<void>();

    onBatchInfer = this.batchInferEmitter.event;
  }

  class PythonExpression extends BaseExpression<PyExpressionJSON> {
    @injectToAST(PythonService) declare service: PythonService;

    static kind: string = 'BlockwisePythonExpression';

    _uri?: string;

    _content?: string;

    // Blockwise 通过 schema 变更时输出的方式来进行类型推导
    getRefFields() {
      return [];
    }

    returnType: BaseType<any> | undefined;

    _prevType: any;

    // Blockwise 中 表达式通过 uri 来进行索引定位
    fromJSON(json: PyExpressionJSON): void {
      if (json.uri !== this._uri || json.content !== this._content) {
        this.service.infer(json).then((res) => {
          this._prevType = res;
          this.updateChildNodeByKey('returnType', res);
        });
        this._uri = json.uri;
        this._content = json.content;
      }
    }

    toJSON(): PyExpressionJSON {
      return {
        content: this._content!,
        uri: this._uri!,
      };
    }

    constructor(params: CreateASTParams) {
      super(params);

      this.toDispose.push(
        // 监听后端触发批量校验
        this.service.onBatchInfer(() => {
          const nextType = this.service.uriToType[this._uri!];

          if (!isEqual(nextType, this._prevType)) {
            this.updateChildNodeByKey('returnType', nextType);
            this._prevType = nextType;
          }
        })
      );
    }
  }

  const createBlockwisePythonExpression = (json: PyExpressionJSON) => ({
    kind: 'BlockwisePythonExpression',
    ...json,
  });

  const container: Container = getContainer((bind) => {
    bind(PythonService).toSelf().inSingletonScope();
  });

  const variableEngine: VariableEngine = container.get(VariableEngine);
  const pythonService: PythonService = container.get(PythonService);

  variableEngine.astRegisters.registerAST(PythonExpression, () => ({
    pythonService,
  }));
  const testScope = variableEngine.createScope('test');

  test('1. Infer When Expression Changed', async () => {
    const variable1: VariableDeclaration = testScope.ast.set(
      'variable1',
      ASTFactory.createVariableDeclaration({
        key: 'variable1',
        initializer: createBlockwisePythonExpression({
          uri: 'blockwise://expression/a',
          content: 'a + b',
        }),
      })
    );

    await delay(0);
    expect(variable1.type?.kind).toEqual('String');
    expect(variable1.version).toEqual(1);

    // 更新表达式
    pythonService.uriToType['blockwise://expression/a'] = { kind: 'Number' };
    variable1.fromJSON({
      initializer: createBlockwisePythonExpression({
        uri: 'blockwise://expression/a',
        content: 'a + b + c',
      }),
    });

    await delay(0);
    expect(variable1.type?.kind).toEqual('Number');
    expect(variable1.version).toEqual(2);
  });

  test('2. Infer When Global Update Triggered', async () => {
    const variable2: VariableDeclaration = testScope.ast.set(
      'variable2',
      ASTFactory.createVariableDeclaration({
        key: 'variable2',
        initializer: createBlockwisePythonExpression({
          uri: 'blockwise://expression/b',
          content: 'a + b',
        }),
      })
    );
    await delay(0);
    expect(variable2.type?.kind).toEqual('Number');
    expect(variable2.version).toEqual(1);

    // 1. 表达式类型没有变化
    pythonService.uriToType['blockwise://expression/b'] = { kind: 'Number' };
    pythonService.batchInferEmitter.fire();
    await delay(0);
    expect(variable2.type?.kind).toEqual('Number');
    expect(variable2.version).toEqual(1);

    // 2. 表达式类型发生了变化
    pythonService.uriToType['blockwise://expression/b'] = { kind: 'Boolean' };
    pythonService.batchInferEmitter.fire();
    await delay(0);
    expect(variable2.type?.kind).toEqual('Boolean');
    expect(variable2.version).toEqual(2);
  });
});
