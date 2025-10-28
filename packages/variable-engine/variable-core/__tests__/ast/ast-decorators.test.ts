/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, test } from 'vitest';

import { VariableEngine } from '../../src/variable-engine';
import { ASTNode, postConstructAST } from '../../src/ast';
import { getContainer } from '../../__mocks__/container';

describe('test ast decorators', () => {
  const container = getContainer();

  const variableEngine: VariableEngine = container.get(VariableEngine);

  const testScope = variableEngine.createScope('test');

  test('@postConstructAST()', () => {
    let postConstructCalled = false;

    class PostConstructTest extends ASTNode {
      static kind = 'PostConstructTest';

      testFlag = false;

      @postConstructAST()
      init() {
        postConstructCalled = true;
        this.testFlag = true;
      }

      fromJSON(json: any): void {
        // do nothing
      }

      toJSON() {
        return {
          testFlag: this.testFlag,
        };
      }
    }

    variableEngine.astRegisters.registerAST(PostConstructTest);
    const ast: PostConstructTest = testScope.ast.set('test', {
      kind: 'PostConstructTest',
    });
    const ast2: PostConstructTest = testScope.ast.set('test', {
      kind: 'PostConstructTest',
    });

    expect(postConstructCalled).toBeTruthy();
    expect(ast.testFlag).toBeTruthy();
    expect(ast2.testFlag).toBeTruthy();
  });

  test('@postConstructAST() Annotate Only One time', () => {
    expect(() => {
      class PostConstructTest2 extends ASTNode {
        static kind = 'PostConstructTest2';

        testFlag1 = false;

        testFlag2 = false;

        @postConstructAST()
        init() {
          this.testFlag1 = true;
        }

        @postConstructAST()
        init2() {
          this.testFlag2 = true;
        }

        fromJSON(json: any): void {
          // do nothing
        }

        toJSON() {
          return {
            testFlag1: this.testFlag1,
            testFlag2: this.testFlag2,
          };
        }
      }
      variableEngine.astRegisters.registerAST(PostConstructTest2);
    }).toThrowError();
  });
});
