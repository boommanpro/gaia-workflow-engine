/**
 * 产物面板里的只读画布预览。
 *
 * 这里的关键态度：**画布是产物的渲染端，不是宿主**。
 * 数据来自 WorkflowDocumentStore（headless DSL），画布只是把它画出来。
 */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { EditorRenderer, FreeLayoutEditorProvider } from '@flowgram.ai/free-layout-editor';

import { useEditorProps } from '../../hooks';
import { nodeRegistries } from '../../nodes';
import type { FlowDocumentJSON } from '../../typings';
import type { WorkflowDsl } from '../../document';

import '@flowgram.ai/free-layout-editor/index.css';

interface ReadonlyCanvasProps {
  dsl: WorkflowDsl;
}

/** 任一节点数据异常时不要带崩整个工作区 */
class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[ai-workspace] canvas preview failed:', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--g-text-muted)',
            fontSize: '12px',
            textAlign: 'center',
            padding: '16px',
          }}
        >
          画布预览不可用，请切换到「预览」或「DSL」页签查看产物
        </div>
      );
    }
    return this.props.children;
  }
}

const CanvasInner: React.FC<ReadonlyCanvasProps> = ({ dsl }) => {
  // flowgram 只在初始化时消费 initialData，产物变化时用 remount 强制重载
  const editorProps = useEditorProps(dsl as unknown as FlowDocumentJSON, nodeRegistries, true);

  return (
    <FreeLayoutEditorProvider {...editorProps}>
      <div style={{ width: '100%', height: '100%', background: 'var(--g-bg-sunken)' }}>
        <EditorRenderer />
      </div>
    </FreeLayoutEditorProvider>
  );
};

export const ReadonlyCanvas: React.FC<ReadonlyCanvasProps> = ({ dsl }) => (
  <CanvasBoundary>
    <CanvasInner dsl={dsl} />
  </CanvasBoundary>
);

export default ReadonlyCanvas;
