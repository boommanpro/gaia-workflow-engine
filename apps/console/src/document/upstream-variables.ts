/**
 * 上游可用变量推断（前端）—— 与后端 WorkflowDslValidator.inferOutputFields 同一规则集：
 *
 * - http / llm / string-format：引擎静态输出（body/headers/statusCode、result、formatStringResult）
 * - condition：各 conditions[].key + else（布尔）
 * - branches：各 branches[].id + else（布尔）
 * - start / code / variable / loop：outputs.properties 声明（未声明=动态输出，标注 unknown）
 *
 * 2026-10-17 反馈3：condition 的 if_match/else 输出此前在前端不可见——
 * 前后端必须用同一套输出口径，规则变更时两边契约测试同时红灯。
 */

export interface UpstreamField {
  name: string;
  type: string;
}

export interface UpstreamNodeVariables {
  nodeId: string;
  type: string;
  title?: string;
  fields: UpstreamField[];
  /** true=动态输出（引擎运行期才有值），仅供提示 */
  dynamic?: boolean;
}

interface CanvasNode {
  id: string;
  type: string;
  data?: Record<string, any>;
}

interface CanvasEdge {
  sourceNodeID: string;
  targetNodeID: string;
  sourcePortID?: string;
}

/** 引擎静态输出表（与后端 node-schemas 的 x-gaia-outputs 一致） */
const STATIC_OUTPUTS: Record<string, string[]> = {
  http: ['body', 'headers', 'statusCode'],
  llm: ['result'],
  'string-format': ['formatStringResult'],
};

function declaredOutputFields(data: Record<string, any> | undefined): UpstreamField[] | null {
  const props = data?.outputs?.properties;
  if (!props || typeof props !== 'object' || Object.keys(props).length === 0) return null;
  return Object.keys(props).map((name) => ({
    name,
    type: props[name]?.type || 'string',
  })) as any;
}

function fieldsOf(type: string, data: Record<string, any>): UpstreamField[] | null {
  // llm json 输出模式：输出=outputs.properties 声明集（引擎解析模型 JSON 后按声明写入）
  if (type === 'llm' && data?.outputMode === 'json') {
    return declaredOutputFields(data);
  }
  const staticOut = STATIC_OUTPUTS[type];
  if (staticOut) {
    return staticOut.map((name) => ({ name, type: name === 'headers' ? 'object' : 'string' }));
  }
  switch (type) {
    case 'condition': {
      const keys = (data?.conditions || [])
        .map((c: any) => c?.key)
        .filter((k: string | undefined) => !!k)
        .map((k: string) => ({ name: k, type: 'boolean' }));
      return [...keys, { name: 'else', type: 'boolean' }];
    }
    case 'branches': {
      const ids = (data?.branches || [])
        .map((b: any) => b?.id)
        .filter((id: string | undefined) => !!id)
        .map((id: string) => ({ name: id, type: 'boolean' }));
      return [...ids, { name: 'else', type: 'boolean' }];
    }
    case 'start':
    case 'code':
    case 'variable':
    case 'loop':
    case 'workflow': {
      const declared = declaredOutputFields(data);
      if (declared) return declared as UpstreamField[];
      // start 必有 outputs（空也算已声明）；code/variable/loop 未声明 = 动态
      if (type === 'start') return [];
      return null;
    }
    default:
      return null;
  }
}

/**
 * 计算指定节点的上游（含全图可达）可用变量。
 * 上游判定：沿边反向 BFS（与数据流方向一致）。
 */
export function upstreamVariables(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  targetNodeId: string
): UpstreamNodeVariables[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  if (!byId.has(targetNodeId)) return [];

  // 反向 BFS 收集所有上游
  const incoming = new Map<string, string[]>();
  for (const e of edges) {
    if (!incoming.has(e.targetNodeID)) incoming.set(e.targetNodeID, []);
    incoming.get(e.targetNodeID)!.push(e.sourceNodeID);
  }
  const upstreamIds = new Set<string>();
  const queue = [targetNodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const src of incoming.get(current) || []) {
      if (!upstreamIds.has(src)) {
        upstreamIds.add(src);
        queue.push(src);
      }
    }
  }

  const result: UpstreamNodeVariables[] = [];
  for (const node of nodes) {
    if (!upstreamIds.has(node.id)) continue;
    const fields = fieldsOf(node.type, node.data || {});
    if (fields === null) continue; // 动态输出节点不展示空列表
    result.push({
      nodeId: node.id,
      type: node.type,
      title: node.data?.title,
      fields,
    });
  }
  return result;
}

/** 组装引用语法片段（展示用） */
export function refSyntax(nodeId: string, field: string): string {
  return `{{ ${nodeId}.${field} }}`;
}
