/**
 * 后端版本 diff（GET /workflow-version/diff/{id}）→ 前端 DeltaDetailsView 的映射。
 *
 * 纯数据变换（无 UI 依赖，可单测）：后端 diff 数组是 id / 边键列表
 * （"from→to@port"），标题靠 nodeTitles 映射补全（removed 节点的标题只在旧版数据里，
 * 由后端合并两版后下发）。
 */
import type { WorkflowVersionDiffResponse } from '../../services/workflow-api';
import type { DslChangeDetails, EdgeChangeDetail, NodeChangeDetail } from '../../document/history';

/** 后端边键 "from→to@port" → { fromTitle, toTitle, fromPort }（标题查 nodeTitles，缺省回退 id） */
export function parseEdgeKey(
  key: string,
  titles: Record<string, string>
): Omit<EdgeChangeDetail, 'key' | 'change'> {
  const portIdx = key.lastIndexOf('@');
  const port = portIdx >= 0 ? key.slice(portIdx + 1) : undefined;
  const body = portIdx >= 0 ? key.slice(0, portIdx) : key;
  const sep = body.indexOf('→');
  const from = sep >= 0 ? body.slice(0, sep) : body;
  const to = sep >= 0 ? body.slice(sep + 1) : body;
  return {
    fromTitle: titles[from] || from,
    toTitle: titles[to] || to,
    ...(port ? { fromPort: port } : {}),
  };
}

/** 后端 diff（id 列表）→ DeltaDetailsView 的 DslChangeDetails */
export function backendDiffToChangeDetails(res: WorkflowVersionDiffResponse): DslChangeDetails {
  const titles = res.nodeTitles || {};
  const nodes: NodeChangeDetail[] = [];
  const pushNodes = (ids: string[] | undefined, change: NodeChangeDetail['change']) =>
    (ids || []).forEach((id) =>
      nodes.push({ nodeId: id, title: titles[id] || id, type: '', change })
    );
  pushNodes(res.diff?.nodes?.added, 'added');
  pushNodes(res.diff?.nodes?.changed, 'updated');
  pushNodes(res.diff?.nodes?.removed, 'removed');

  const edges: EdgeChangeDetail[] = [];
  const pushEdges = (keys: string[] | undefined, change: 'added' | 'removed') =>
    (keys || []).forEach((key) => edges.push({ key, ...parseEdgeKey(key, titles), change }));
  pushEdges(res.diff?.edges?.added, 'added');
  pushEdges(res.diff?.edges?.removed, 'removed');

  return { nodes, edges };
}
