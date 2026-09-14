/**
 * HeadlessCanvasBridge —— 让 AI 的画布类工具脱离真实画布运行。
 *
 * 旧链路里 CanvasContext 由 EditorCanvasBridge 注入，而它依赖 flowgram 实例。
 * 结果是「必须先打开编辑器，AI 才能改工作流」——画布成了 AI 的前置依赖。
 *
 * 这里用 WorkflowDocumentStore 实现同一个 CanvasContext 契约：
 * AI 的 addNode / connect / updateNode 全部落到 headless DSL 上，
 * 产物面板负责渲染。画布不再是依赖，只是可选的精修端。
 */
import { useEffect } from 'react';

import { getCanvasContext, setCanvasContext, type CanvasContext } from '../agent/tools';
import { generateNodeId, workflowDocumentStore } from '../document';

function createHeadlessCanvasContext(): CanvasContext {
  const snapshotDoc = () => workflowDocumentStore.getSnapshot().doc;

  const applySource = (source: 'ai' | 'user') => source;

  return {
    toJSON: () => snapshotDoc().toJSON(),

    createNodeByType: (type, position, data, parentId) => {
      const id = generateNodeId(type);
      workflowDocumentStore.mutate(
        (doc) => doc.addNode(type, data, { id, position, parentId }),
        { kind: 'add-node', nodeIds: [id], source: applySource('ai') }
      );
      return { id };
    },

    getNodeById: (id) => snapshotDoc().getNode(id),

    deleteNode: (id) => {
      workflowDocumentStore.mutate((doc) => doc.deleteNode(id), {
        kind: 'delete-node',
        nodeIds: [id],
        source: applySource('ai'),
      });
    },

    addLine: (line) => {
      workflowDocumentStore.mutate(
        (doc) => doc.connect(line.sourceNodeID, line.targetNodeID, line.sourcePortID),
        { kind: 'add-edge', edge: line, source: applySource('ai') }
      );
    },

    removeLine: (from, to) => {
      const existing = snapshotDoc().edges.find(
        (e) => e.sourceNodeID === from && e.targetNodeID === to
      );
      workflowDocumentStore.mutate((doc) => doc.disconnect(from, to), {
        kind: 'delete-edge',
        edge: existing,
        source: applySource('ai'),
      });
    },

    autoLayout: () => {
      workflowDocumentStore.mutate((doc) => doc.autoLayout(), {
        kind: 'layout',
        source: applySource('ai'),
      });
    },

    // WorkflowDocument.updateNode 内部已做深合并（数组整体替换）
    updateNodeData: (nodeId, data) => {
      const before = snapshotDoc();
      workflowDocumentStore.mutate((doc) => doc.updateNode(nodeId, data), {
        kind: 'update-node',
        nodeIds: [nodeId],
        source: applySource('ai'),
      });
      return JSON.stringify(before.getNode(nodeId)) !==
        JSON.stringify(snapshotDoc().getNode(nodeId));
    },

    getAvailableVariables: () => {
      const doc = snapshotDoc();
      return doc.nodes
        .filter((node) => node.data?.outputs)
        .map((node) => {
          const outputs = node.data!.outputs as Record<string, any>;
          const properties = outputs?.properties || {};
          return {
            nodeId: node.id,
            nodeTitle: (node.data?.title as string) || node.type,
            nodeType: node.type,
            outputs: Object.keys(properties).map((name) => ({
              name,
              type: (properties[name] as any)?.type || 'string',
            })),
          };
        });
    },

    // 真实运行需要画布内的 runtime 插件与试运行面板，headless 场景明确回报不可用
    runWorkflow: async () => ({
      success: false,
      error: '运行在编辑器中进行：请先保存为版本后在编辑器里试运行',
    }),
    runNode: async () => ({
      success: false,
      error: '节点试运行需要在编辑器中进行',
    }),
  };
}

/**
 * 无渲染组件：挂载即把 headless 画布上下文注入给 Agent 工具执行器。
 * 编辑器页面会用自己的 EditorCanvasBridge 覆盖它（更晚注册者优先）。
 */
export const HeadlessCanvasBridge: React.FC = () => {
  useEffect(() => {
    const previous = getCanvasContext();
    setCanvasContext(createHeadlessCanvasContext());
    return () => {
      // 只清理自己，避免误删编辑器注入的真实画布上下文
      setCanvasContext(previous ?? null);
    };
  }, []);

  return null;
};

export default HeadlessCanvasBridge;
