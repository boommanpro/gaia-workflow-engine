/**
 * Agent 产物（Artifact）前端 store —— 与 workflowDocumentStore 同一套模式：
 * 模块级单例 + useSyncExternalStore，避免 context 层层透传。
 *
 * 数据来源：
 *   1. 会话打开时 GET /agent/session/{key}/artifacts 全量载入
 *   2. SSE artifact 事件增量 upsert（与后端 SessionArtifactStore 广播一一对应）
 *   3. run_state 快照里的 artifacts 列表（断线重连对齐）
 *
 * 消费方：对话流里的产物卡（test_report / release）、画布活卡、确认应用卡。
 */
import { useSyncExternalStore } from 'react';

export type AgentArtifactType = 'workflow' | 'plan' | 'test_report' | 'release';

export interface AgentArtifactDto {
  artifactKey: string;
  sessionKey?: string;
  runId?: string;
  type: AgentArtifactType;
  status: string;
  title?: string;
  summary?: string;
  version: number;
  payload?: any;
  createdAt?: string;
  updatedAt?: string;
}

interface ArtifactStoreState {
  /** sessionKey → 产物列表（按 updatedAt 升序，与后端一致） */
  bySession: Record<string, AgentArtifactDto[]>;
}

type Listener = () => void;

class ArtifactStore {
  private state: ArtifactStoreState = { bySession: {} };
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ArtifactStoreState => this.state;

  private emit() {
    for (const listener of this.listeners) listener();
  }

  /** 会话打开 / 重连时全量替换 */
  setAll(sessionKey: string, list: AgentArtifactDto[]) {
    if (!sessionKey) return;
    this.state = { bySession: { ...this.state.bySession, [sessionKey]: list || [] } };
    this.emit();
  }

  /** SSE upsert：同 key 覆盖（事件本身带最新 version），新 key 追加到尾部 */
  upsert(sessionKey: string, artifact: AgentArtifactDto) {
    if (!sessionKey || !artifact?.artifactKey) return;
    const list = this.state.bySession[sessionKey] || [];
    const idx = list.findIndex((a) => a.artifactKey === artifact.artifactKey);
    const next =
      idx >= 0
        ? list.map((a, i) => (i === idx ? { ...a, ...artifact } : a))
        : [...list, artifact];
    this.state = { bySession: { ...this.state.bySession, [sessionKey]: next } };
    this.emit();
  }

  /** SSE state 事件：只迁移状态 */
  updateStatus(sessionKey: string, artifactKey: string, status: string) {
    if (!sessionKey || !artifactKey) return;
    const list = this.state.bySession[sessionKey];
    if (!list) return;
    const next = list.map((a) => (a.artifactKey === artifactKey ? { ...a, status } : a));
    this.state = { bySession: { ...this.state.bySession, [sessionKey]: next } };
    this.emit();
  }

  /** 切会话 / 删会话时清空 */
  clear(sessionKey: string) {
    if (!sessionKey || !this.state.bySession[sessionKey]) return;
    const next = { ...this.state.bySession };
    delete next[sessionKey];
    this.state = { bySession: next };
    this.emit();
  }

  /** 会话内某 type 的当前产物（会话级 upsert 语义下唯一） */
  latest(sessionKey: string | null, type: AgentArtifactType): AgentArtifactDto | null {
    if (!sessionKey) return null;
    const list = this.state.bySession[sessionKey];
    if (!list) return null;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].type === type) return list[i];
    }
    return null;
  }

  /** 会话全部产物（不经 hook 的同步读取，供消息重放归位用） */
  latestAll(sessionKey: string | null): AgentArtifactDto[] {
    if (!sessionKey) return [];
    return this.state.bySession[sessionKey] || [];
  }
}

export const artifactStore = new ArtifactStore();

/** React 接入点：返回整个 store 状态（产物量级小，无需切片） */
export function useArtifactState(): ArtifactStoreState {
  return useSyncExternalStore(artifactStore.subscribe, artifactStore.getSnapshot);
}

/** 便捷选择器：当前会话某类型的最新产物 */
export function useLatestArtifact(sessionKey: string | null, type: AgentArtifactType): AgentArtifactDto | null {
  useArtifactState();
  return artifactStore.latest(sessionKey, type);
}
