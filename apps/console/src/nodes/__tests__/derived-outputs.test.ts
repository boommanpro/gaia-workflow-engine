import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { deriveBranchesOutputs, deriveConditionOutputs } from '../derived-outputs';

/**
 * 动态输出物化 parity 契约（condition/branches）：
 * 与后端 NodeDataNormalizer.deriveConditionOutputs/deriveBranchesOutputs 引用同一份
 * fixture（specs/node-contracts/fixtures/dynamic-node-outputs.json）——派生规则单边改动
 * 必然红灯，防止画布变量引擎与引擎运行时的输出口径再度分叉。
 *
 * fixture 路径：src/nodes/__tests__ → repo root 上溯 5 层。
 */
const FIXTURE = JSON.parse(
  readFileSync(
    new URL(
      '../../../../../specs/node-contracts/fixtures/dynamic-node-outputs.json',
      import.meta.url
    ),
    'utf-8'
  )
);

describe('derived-outputs（与后端 NodeDataNormalizer 同一 parity fixture）', () => {
  for (const testCase of FIXTURE.cases) {
    it(`${testCase.name}：物化结果与契约期望一致`, () => {
      const derived =
        testCase.type === 'condition'
          ? deriveConditionOutputs(testCase.conditions)
          : deriveBranchesOutputs(testCase.branches);
      expect(derived).toEqual(testCase.expectedOutputs);
    });
  }

  it('每个 case 都覆盖了类型与期望形状（fixture 自检，防样例写错静默通过）', () => {
    for (const testCase of FIXTURE.cases) {
      expect(['condition', 'branches']).toContain(testCase.type);
      expect(testCase.expectedOutputs.properties.else).toEqual({ type: 'boolean' });
    }
    expect(FIXTURE.cases.length).toBeGreaterThanOrEqual(6);
  });
});
