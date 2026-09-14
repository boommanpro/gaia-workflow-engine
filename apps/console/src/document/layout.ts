/**
 * 无画布依赖的自动分层布局（headless）。
 *
 * 场景：AI 一次性生成整份 DSL 时通常不关心坐标，这里按拓扑深度
 * 做「从左到右」的分层排布，保证画布渲染出来是可读的，而不是一团重叠。
 */
import type { DslNode, NodePosition, WorkflowDsl } from './types';

const LAYOUT_GAP_X = 320;
const LAYOUT_GAP_Y = 180;
const ORIGIN: NodePosition = { x: 80, y: 120 };

/**
 * 原地计算并写入每个节点的 meta.position。
 * 使用 Kahn 拓扑排序；存在环时，环内节点按发现顺序归到同一层，不会死循环。
 */
export function autoLayoutDsl(dsl: WorkflowDsl): void {
  const nodes = dsl.nodes || [];
  if (nodes.length === 0) return;

  const ids = nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const indegree = new Map<string, number>();
  const children = new Map<string, string[]>();

  for (const id of ids) {
    indegree.set(id, 0);
    children.set(id, []);
  }
  for (const edge of dsl.edges || []) {
    if (!idSet.has(edge.sourceNodeID) || !idSet.has(edge.targetNodeID)) continue;
    children.get(edge.sourceNodeID)!.push(edge.targetNodeID);
    indegree.set(edge.targetNodeID, (indegree.get(edge.targetNodeID) || 0) + 1);
  }

  // ---- Kahn 分层 ----
  const depth = new Map<string, number>();
  let frontier = ids.filter((id) => (indegree.get(id) || 0) === 0);
  for (const id of frontier) depth.set(id, 0);

  let guard = nodes.length + 1;
  while (frontier.length > 0 && guard-- > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const child of children.get(id) || []) {
        depth.set(child, Math.max(depth.get(child) ?? 0, (depth.get(id) ?? 0) + 1));
        const left = (indegree.get(child) || 0) - 1;
        indegree.set(child, left);
        if (left === 0) next.push(child);
      }
    }
    frontier = next;
  }

  // 环内 / 未覆盖的节点补一层
  const maxDepth = Math.max(...Array.from(depth.values(), (d) => d), 0);
  for (const id of ids) {
    if (!depth.has(id)) depth.set(id, maxDepth + 1);
  }

  // ---- 按层堆叠 ----
  const columns = new Map<number, string[]>();
  for (const id of ids) {
    const d = depth.get(id) ?? 0;
    if (!columns.has(d)) columns.set(d, []);
    columns.get(d)!.push(id);
  }

  const nodeById = new Map<string, DslNode>(nodes.map((n) => [n.id, n]));
  for (const [d, columnIds] of columns) {
    columnIds.forEach((id, row) => {
      const node = nodeById.get(id);
      if (!node) return;
      node.meta = {
        ...(node.meta || {}),
        position: {
          x: ORIGIN.x + d * LAYOUT_GAP_X,
          y: ORIGIN.y + row * LAYOUT_GAP_Y,
        },
      };
    });
  }
}

/** 返回一份带坐标的 DSL 深拷贝（不改原对象） */
export function withAutoLayout(dsl: WorkflowDsl): WorkflowDsl {
  const copy: WorkflowDsl = JSON.parse(JSON.stringify(dsl));
  autoLayoutDsl(copy);
  return copy;
}
