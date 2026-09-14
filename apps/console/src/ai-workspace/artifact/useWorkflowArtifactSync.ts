/**
 * 把对话里的「工作流产物」同步进 headless DSL 单一事实源。
 *
 * 这是 AI 主视角的核心连线：
 *   对话消息（AI 的输出）──► WorkflowDocumentStore（产物）──► 画布 / 落版 / 精修
 *
 * 注意这里不依赖任何画布实例：哪怕 /editor 从没打开过，产物依然成立。
 */
import { useEffect, useRef } from 'react';

import { useAgent } from '../../agent/AgentContext';
import {
  WorkflowDocument,
  normalizeWorkflowDsl,
  workflowDocumentStore,
} from '../../document';
import { findLatestWorkflow } from './extract';
import { bindSessionToWorkflow } from '../session-scope';

/**
 * 同步器。放在 AI 工作区内即可，返回最近一次是否成功刷新了产物。
 */
export function useWorkflowArtifactSync(): { appliedRepairs: string[] } {
  const { messages, currentSessionKey, streaming } = useAgent();
  const appliedRef = useRef<{ messageId: string; sessionKey: string | null } | null>(null);
  const repairsRef = useRef<string[]>([]);
  /** 已经记过「失败」的消息，避免流式过程中反复刷屏 */
  const failedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 历史归属当前这段会话：换会话就换一套版本记录，并尝试拾回它上次的撤销深度
    workflowDocumentStore.setScope(currentSessionKey);

    const candidate = findLatestWorkflow(messages);

    // 没有候选产物（新会话 / 清空对话）：归零，避免串到上一轮会话的产物。
    // 只回收「AI 产出过的」内容 —— 从后端载入 / 导入的工作流不该被一次会话切换抹掉。
    if (!candidate) {
      if (appliedRef.current) {
        appliedRef.current = null;
        repairsRef.current = [];
        const snapshot = workflowDocumentStore.getSnapshot();
        if (snapshot.meta.producedBy === 'ai' && !snapshot.doc.isEmpty) {
          workflowDocumentStore.clear();
        }
      }
      failedRef.current.clear();
      return;
    }

    const signature = { messageId: candidate.messageId, sessionKey: currentSessionKey };
    const previous = appliedRef.current;
    if (previous && previous.messageId === signature.messageId && previous.sessionKey === signature.sessionKey) {
      return; // 同一条消息已应用过
    }

    // 画布上已经站着一份「正式版本」（从后端载入 / 导入的），
    // 就不该再被对话历史里的旧产出覆盖 —— 否则从工作流库进专家模式会看到聊天记录里的老图。
    const snapshotNow = workflowDocumentStore.getSnapshot();
    if (!snapshotNow.doc.isEmpty && snapshotNow.meta.producedBy !== 'ai') {
      appliedRef.current = signature;
      return;
    }

    const { dsl, repairs } = normalizeWorkflowDsl(candidate.raw);

    // 产出不合法 —— 画布必须保持原样，同时记一笔「这一轮失败了」，
    // 对话里那张卡会因此变成红色的「画布已保护」，用户可以重试而不是自己收拾残局。
    if (!dsl.nodes.length) {
      if (!streaming && !failedRef.current.has(candidate.messageId)) {
        failedRef.current.add(candidate.messageId);
        // 失败轮也归因到「产出它的助手消息」，让对话栏出现红色的保护卡
        workflowDocumentStore.captureFailure(
          candidate.ownerMessageId,
          repairs.length > 0 ? repairs.join(' · ') : ''
        );
      }
      return;
    }

    const hadContent = workflowDocumentStore.getSnapshot().doc.isEmpty === false;

    workflowDocumentStore.replace(WorkflowDocument.fromJSON(dsl), {
      kind: 'replace',
      source: 'ai',
      // ownerMessageId 是「产出这条工作流的助手消息」：若是工具消息则回溯到最近的
      // assistant 占位。用它归因，挂载即恢复的历史也能正确挂卡（不依赖当前生成轮时序）。
      messageId: candidate.ownerMessageId,
      reason: hadContent ? 'ai-edit' : 'ai-generate',
    });
    workflowDocumentStore.setMeta({ producedBy: 'ai' });
    // 工具带回落版信息时一并挂上，刷新页面后产物仍然「知道」自己属于哪个工作流，
    // 否则右侧主按钮会一直停在「在编辑器中精修（草稿）」而不是「打开工作流」。
    if (candidate.workflowCode) {
      const name = candidate.workflowName || candidate.workflowCode;
      workflowDocumentStore.markSaved({
        workflowCode: candidate.workflowCode,
        workflowName: name,
      });
      workflowDocumentStore.setMeta({
        producedBy: 'ai',
        workflowCode: candidate.workflowCode,
        workflowName: name,
      });
      // 产出它的这段对话归它所有 —— 进专家模式时该会话会跟着走
      if (currentSessionKey) {
        bindSessionToWorkflow(currentSessionKey, candidate.workflowCode);
      }
    }

    appliedRef.current = signature;
    repairsRef.current = repairs;
  }, [messages, currentSessionKey, streaming]);

  return { appliedRepairs: repairsRef.current };
}
