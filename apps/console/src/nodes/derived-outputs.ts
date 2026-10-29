/**
 * 动态输出节点的 outputs 物化规则（condition / branches）。
 *
 * 与后端 NodeDataNormalizer.deriveConditionOutputs / deriveBranchesOutputs 是同一规则集：
 * 输出 = 每个 conditions[].key（或 branches[].id）的布尔命中结果 + 恒在的 else（布尔），
 * 运行时口径见 ConditionNode.execute / BranchesNode.execute。
 *
 * 三个消费方共用本函数，规则只此一份：
 * - form-meta effect：把派生 schema 写进变量引擎（condition/branches 此前 scope 无输出，
 *   下游变量选择器与 {{ }} 模板校验都查不到 condition_x.if_pass 这类引用）；
 * - formatOnSubmit：保存时物化进 data.outputs（与 catalog defaults / 引擎产出对齐）；
 * - document/upstream-variables.ts：run-node-panel 的上游变量推断。
 *
 * 跨端 parity 由 specs/node-contracts/fixtures/dynamic-node-outputs.json 钉住：
 * 前后端契约测试引用同一份样例，规则单边改动必然红灯。
 */

export interface DerivedOutputsSchema {
  type: 'object';
  properties: Record<string, { type: 'boolean' }>;
}

const BOOLEAN_FIELD = { type: 'boolean' } as const;

function deriveBooleanOutputs(names: unknown, nameField: string): DerivedOutputsSchema {
  const properties: Record<string, { type: 'boolean' }> = {};
  if (Array.isArray(names)) {
    for (const item of names) {
      const name = item?.[nameField];
      if (typeof name === 'string' && name.trim() !== '') {
        properties[name] = { ...BOOLEAN_FIELD };
      }
    }
  }
  properties.else = { ...BOOLEAN_FIELD };
  return { type: 'object', properties };
}

/** condition：每个 conditions[].key 输出布尔命中结果 + else */
export function deriveConditionOutputs(conditions: unknown): DerivedOutputsSchema {
  return deriveBooleanOutputs(conditions, 'key');
}

/** branches：每个 branches[].id 输出布尔命中结果 + else */
export function deriveBranchesOutputs(branches: unknown): DerivedOutputsSchema {
  return deriveBooleanOutputs(branches, 'id');
}

/** 从派生 schema 里取字段清单（upstream-variables 的展示口径：保持声明顺序） */
export function fieldsOfDerivedOutputs(
  schema: DerivedOutputsSchema
): { name: string; type: string }[] {
  return Object.entries(schema.properties).map(([name, prop]) => ({
    name,
    type: prop?.type || 'boolean',
  }));
}
