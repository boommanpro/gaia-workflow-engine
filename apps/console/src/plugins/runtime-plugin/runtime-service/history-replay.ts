/**
 * 历史回放纯逻辑 —— 2026-11-07 运行历史方案 A。
 * 后端持久化的节点执行记录（WorkflowNodeRunRecord 形状）→ flowgram NodeReport
 * 的转换与画布匹配规划。纯函数、不触碰编辑器实例；service 层
 * （runtime-service/index.ts）只负责把规划结果分发到 document / emitter。
 */
import {
  NodeReport,
  WorkflowInputs,
  WorkflowOutputs,
  WorkflowStatus,
} from '@flowgram.ai/runtime-interface';

/** 回放输入：面板把后端 WorkflowNodeRunRecord[] 映射到这里（本模块不依赖 API 类型） */
export interface HistoryNodeReportInput {
  nodeId: string;
  status?: string | null;
  errorMessage?: string | null;
  inputsJson?: string | null;
  outputJson?: string | null;
  timeCostMs?: number | null;
}

/** 回放状态（面板徽标 / 画布横幅共用）：matched 是命中当前画布的节点数 */
export interface ReplayState {
  taskId: string;
  /** 展示用标签（运行完成时间，面板格式化后传入） */
  label: string;
  matched: number;
  total: number;
}

/**
 * 回放状态模块 store —— 画布横幅（RunReplayBanner）的数据源。
 * 横幅渲染在 FreeLayoutEditorProvider 子级、EditorRenderer 之外，那里的 DI 上下文
 * 解析不到插件绑定的 WorkflowRuntimeService（编辑器容器重建窗口期会抛
 * "No matching bindings" 并卸载整棵 React 树 = 白屏，2026-11-07 实测）。
 * 因此横幅走模块 store：service 写入状态与退出动作，横幅 useSyncExternalStore 订阅，
 * 全程不碰 DI。exit 为 null 表示当前没有可退出的回放。
 */
export interface ReplaySnapshot {
  state: ReplayState;
  exit: () => void;
}

type ReplayListener = () => void;

let replaySnapshot: ReplaySnapshot | null = null;
const replayListeners = new Set<ReplayListener>();

export const replayStore = {
  getSnapshot: (): ReplaySnapshot | null => replaySnapshot,
  /** service 发布/清除回放态；exit 由 service 注入（内部会清画布节点状态） */
  publish(next: ReplaySnapshot | null): void {
    replaySnapshot = next;
    replayListeners.forEach((listener) => listener());
  },
  subscribe(listener: ReplayListener): () => void {
    replayListeners.add(listener);
    return () => replayListeners.delete(listener);
  },
};

/** 回放展示口径：run 级（success/failed/canceled）与节点级（succeeded/failed/canceled/pending）
 *  统一成四类——面板记录行、轨迹行与画布回放共用同一映射，避免各处漂移 */
export type ReplayStatusKind = 'success' | 'failure' | 'canceled' | 'pending';

export function historyStatusToKind(status?: string | null): ReplayStatusKind {
  switch (String(status || '').toLowerCase()) {
    case 'success':
    case 'succeeded':
      return 'success';
    case 'failed':
    case 'error':
      return 'failure';
    case 'canceled':
    case 'cancelled':
      return 'canceled';
    default:
      return 'pending';
  }
}

/** 后端持久化 status 串 → WorkflowStatus（run 记录与节点记录同口径） */
export function historyStatusToWorkflowStatus(status?: string | null): WorkflowStatus {
  switch (historyStatusToKind(status)) {
    case 'success':
      return WorkflowStatus.Succeeded;
    case 'failure':
      return WorkflowStatus.Failed;
    case 'canceled':
      return WorkflowStatus.Cancelled;
    default:
      return WorkflowStatus.Pending;
  }
}

/** JSON 文本 → 快照 payload：解析失败/非对象包成 { value }，保证 DataStructureViewer 可渲染 */
function parseSnapshotPayload(text?: string | null): Record<string, unknown> {
  if (!text) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { value: parsed };
  } catch {
    return { value: text };
  }
}

/** 单条历史节点记录 → NodeReport（单快照；分支未持久化，不回放连线动画） */
export function historyNodeToReport(record: HistoryNodeReportInput): NodeReport {
  const status = historyStatusToWorkflowStatus(record.status);
  const timeCost = record.timeCostMs ?? 0;
  return {
    id: record.nodeId,
    status,
    terminated: status !== WorkflowStatus.Pending,
    startTime: 0,
    endTime: timeCost,
    timeCost,
    snapshots: [
      {
        id: `${record.nodeId}-replay-0`,
        nodeID: record.nodeId,
        inputs: parseSnapshotPayload(record.inputsJson) as WorkflowInputs,
        outputs: parseSnapshotPayload(record.outputJson) as WorkflowOutputs,
        data: {},
        ...(record.errorMessage ? { error: record.errorMessage } : {}),
      },
    ],
  };
}

/** 回放分布规划：给定画布可执行节点 id（已剔除 block-start/end），
 *  只保留历史里真实存在且画布上仍在的节点报告；matched/total 供横幅提示。 */
export function planReplayDistribution(
  records: HistoryNodeReportInput[],
  canvasNodeIds: string[]
): { applied: NodeReport[]; matched: number; total: number } {
  const reportsById = new Map(
    records.map((record) => [record.nodeId, historyNodeToReport(record)])
  );
  const applied = canvasNodeIds
    .filter((nodeId) => reportsById.has(nodeId))
    .map((nodeId) => reportsById.get(nodeId)!);
  return { applied, matched: applied.length, total: canvasNodeIds.length };
}
