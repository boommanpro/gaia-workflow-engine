/**
 * DSL 迁移层 —— 文档载入时把历史形状迁移到当前契约。
 *
 * 每个迁移必须：可重入（迁移过的文档再跑一遍结果不变）、无 UI 依赖（纯数据变换）。
 * 后端 WorkflowDslValidator 对未知类型是 error 级拒绝，所以迁移必须在载入时完成，
 * 否则画布上的存量 multi-condition 节点会让保存/执行全部被门禁打回。
 */
import type { WorkflowDsl } from './types';

type DslDocument = Pick<WorkflowDsl, 'nodes' | 'edges'>;

interface LegacyMultiConditionBranch {
  title?: string;
  logic?: string;
  conditions?: { key?: string; value?: unknown }[];
}

/**
 * multi-condition → branches。
 *
 * multi-condition 是从官方 flowgram 示例同步进来的节点，但后端从未实现它的解析器
 * （NodeTypeEnum/ChainParser 均无）——画布上建了也无法执行，执行时直接 NPE。
 * 它的多条件互斥语义与 branches 一致：每个 branch 带 conditions + and/or logic。
 * 迁移映射：branch[i] → branches[i]（id=branch_{i+1}），出边端点 key → 对应 branch id，
 * else 端口名两边相同不用改。
 */
export function migrateMultiConditionToBranches<T extends DslDocument>(dsl: T): T {
  const hasMulti = dsl.nodes.some((n) => n && (n as { type?: string }).type === 'multi-condition');
  if (!hasMulti) {
    return dsl;
  }
  /** nodeId → (conditionKey → branchId)，出边端口重映射用 */
  const portRemap = new Map<string, Map<string, string>>();
  const nodes = dsl.nodes.map((node) => {
    if (!node || (node as { type?: string }).type !== 'multi-condition') {
      return node;
    }
    const data = (node.data ?? {}) as Record<string, unknown>;
    const legacyBranches = (Array.isArray(data.branch) ? data.branch : []) as LegacyMultiConditionBranch[];
    const mapping = new Map<string, string>();
    const branches = legacyBranches.map((branch, index) => {
      const id = `branch_${index + 1}`;
      for (const cond of branch.conditions ?? []) {
        if (cond?.key) {
          mapping.set(cond.key, id);
        }
      }
      return {
        id,
        title: branch.title ?? `分支 ${index + 1}`,
        logic: branch.logic ?? 'and',
        conditions: branch.conditions ?? [],
      };
    });
    portRemap.set(node.id, mapping);
    const nextData: Record<string, unknown> = { ...data, branches };
    delete nextData.branch;
    delete nextData.else;
    return { ...node, type: 'branches', data: nextData };
  });
  const edges = dsl.edges.map((edge) => {
    if (!edge?.sourcePortID || edge.sourcePortID === 'else') {
      return edge;
    }
    const mapping = portRemap.get(edge.sourceNodeID);
    const branchId = mapping?.get(edge.sourcePortID);
    return branchId ? { ...edge, sourcePortID: branchId } : edge;
  });
  console.info('[dsl-migrate] multi-condition 节点已自动迁移为 branches');
  return { ...dsl, nodes, edges };
}

/** 载入文档统一入口：按顺序跑所有迁移 */
export function migrateLegacyDsl<T extends DslDocument>(dsl: T): T {
  return migrateMultiConditionToBranches(dsl);
}
