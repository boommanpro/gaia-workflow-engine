/**
 * 会话 ↔ 画布历史的 scope 绑定。
 *
 * v3 起画布内容只经两条权威通道流动，本 hook 不再做「扫描对话正文找 DSL」：
 *  · 服务端 document 事件 / GET /document —— AgentContext 的绑定层应用到
 *    workflowDocumentStore（全量或增量 ops）；
 *  · 用户手改 —— canvas-sync 回流 store。
 * 这里只负责「换会话换一套快照历史」（撤销深度跟随会话）。
 */
import { useEffect } from 'react';

import { useAgent } from '../../agent/AgentContext';
import { workflowDocumentStore } from '../../document';

export function useWorkflowArtifactSync(): void {
  const { currentSessionKey } = useAgent();
  useEffect(() => {
    workflowDocumentStore.setScope(currentSessionKey);
  }, [currentSessionKey]);
}
