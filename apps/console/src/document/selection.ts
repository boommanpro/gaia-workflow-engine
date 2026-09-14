/**
 * 画布选中状态 —— 让「我在画布上指着哪个节点」这件事，对话侧也看得见。
 *
 * 之前的体验断点：用户在画布上点中一个节点，右侧 Copilot 毫无反应，
 * 想追问一句「这个节点为什么这么配」只能自己把节点名打出来。
 *
 * 这里把选中状态从一个「画布内部事件」提升为一个可订阅的外部状态，
 * 侧边栏据此渲染引用 chip 与快捷动作。
 *
 * 与 WorkflowDocumentStore 同样的订阅写法，但语义独立：它描述的是「视图焦点」，
 * 不参与文档历史，也不该进快照。
 */
import { useSyncExternalStore } from 'react';

export interface CanvasSelection {
  nodeId: string;
  nodeTitle: string;
  nodeType: string;
}

type Listener = () => void;

class CanvasSelectionStore {
  private state: CanvasSelection | null = null;
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): CanvasSelection | null => this.state;

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  select(next: CanvasSelection | null): void {
    if (!next && !this.state) return;
    if (next && this.state && next.nodeId === this.state.nodeId && next.nodeTitle === this.state.nodeTitle) {
      return;
    }
    this.state = next;
    this.emit();
  }

  clear(): void {
    if (!this.state) return;
    this.state = null;
    this.emit();
  }
}

export const canvasSelectionStore = new CanvasSelectionStore();

export function useCanvasSelection(): CanvasSelection | null {
  return useSyncExternalStore(canvasSelectionStore.subscribe, canvasSelectionStore.getSnapshot);
}
