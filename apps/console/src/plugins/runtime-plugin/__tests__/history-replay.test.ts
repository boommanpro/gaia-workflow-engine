/**
 * 历史回放纯逻辑测试（状态映射 / NodeReport 转换 / 画布匹配规划）—— 2026-11-07 方案 A。
 * 覆盖 runtime-service.applyHistoryReport 依赖的全部决策逻辑；
 * service 到 document/emitter 的分发与面板渲染不在单测范围（交付说明里如实标注）。
 */
import { describe, expect, it } from 'vitest';
import { WorkflowStatus } from '@flowgram.ai/runtime-interface';

import {
  historyNodeToReport,
  historyStatusToKind,
  historyStatusToWorkflowStatus,
  planReplayDistribution,
} from '../runtime-service/history-replay';

describe('historyStatusToKind（面板展示口径）', () => {
  it('run 级与节点级串值统一四类', () => {
    expect(historyStatusToKind('success')).toBe('success');
    expect(historyStatusToKind('succeeded')).toBe('success');
    expect(historyStatusToKind('failed')).toBe('failure');
    expect(historyStatusToKind('canceled')).toBe('canceled');
    expect(historyStatusToKind('pending')).toBe('pending');
    expect(historyStatusToKind(undefined)).toBe('pending');
  });
});

describe('historyStatusToWorkflowStatus', () => {
  it('后端 status 串映射到 WorkflowStatus（大小写/别名宽容）', () => {
    expect(historyStatusToWorkflowStatus('success')).toBe(WorkflowStatus.Succeeded);
    expect(historyStatusToWorkflowStatus('succeeded')).toBe(WorkflowStatus.Succeeded);
    expect(historyStatusToWorkflowStatus('SUCCESS')).toBe(WorkflowStatus.Succeeded);
    expect(historyStatusToWorkflowStatus('failed')).toBe(WorkflowStatus.Failed);
    expect(historyStatusToWorkflowStatus('error')).toBe(WorkflowStatus.Failed);
    expect(historyStatusToWorkflowStatus('canceled')).toBe(WorkflowStatus.Cancelled);
    expect(historyStatusToWorkflowStatus('cancelled')).toBe(WorkflowStatus.Cancelled);
  });

  it('空值/未知值回落 Pending（快照存在但状态缺失时不假装成功）', () => {
    expect(historyStatusToWorkflowStatus(undefined)).toBe(WorkflowStatus.Pending);
    expect(historyStatusToWorkflowStatus(null)).toBe(WorkflowStatus.Pending);
    expect(historyStatusToWorkflowStatus('processing')).toBe(WorkflowStatus.Pending);
    expect(historyStatusToWorkflowStatus('running')).toBe(WorkflowStatus.Pending);
  });
});

describe('historyNodeToReport', () => {
  it('成功记录：单快照携带解析后的入参/出参与耗时', () => {
    const report = historyNodeToReport({
      nodeId: 'llm_0',
      status: 'success',
      inputsJson: '{"prompt":"hi"}',
      outputJson: '{"text":"ok"}',
      timeCostMs: 31,
    });
    expect(report.id).toBe('llm_0');
    expect(report.status).toBe(WorkflowStatus.Succeeded);
    expect(report.terminated).toBe(true);
    expect(report.timeCost).toBe(31);
    expect(report.snapshots).toHaveLength(1);
    expect(report.snapshots[0].inputs).toEqual({ prompt: 'hi' });
    expect(report.snapshots[0].outputs).toEqual({ text: 'ok' });
    expect(report.snapshots[0].error).toBeUndefined();
  });

  it('失败记录：errorMessage 写入快照 error', () => {
    const report = historyNodeToReport({
      nodeId: 'http_0',
      status: 'failed',
      errorMessage: 'connect ECONNREFUSED',
      timeCostMs: 1800,
    });
    expect(report.status).toBe(WorkflowStatus.Failed);
    expect(report.snapshots[0].error).toBe('connect ECONNREFUSED');
    expect(report.snapshots[0].inputs).toEqual({});
  });

  it('JSON 解析失败/非对象不抛错：包成 { value } 供查看器渲染', () => {
    const broken = historyNodeToReport({
      nodeId: 'a',
      status: 'success',
      inputsJson: 'not-json',
      outputJson: '"plain-string"',
    });
    expect(broken.snapshots[0].inputs).toEqual({ value: 'not-json' });
    expect(broken.snapshots[0].outputs).toEqual({ value: 'plain-string' });
  });

  it('缺耗时按 0 计（不出现 NaN）', () => {
    const report = historyNodeToReport({ nodeId: 'a', status: 'success' });
    expect(report.timeCost).toBe(0);
    expect(report.endTime).toBe(0);
  });
});

describe('planReplayDistribution', () => {
  const records = [
    { nodeId: 'start_0', status: 'success' },
    { nodeId: 'llm_0', status: 'failed', errorMessage: 'boom' },
    { nodeId: 'ghost_0', status: 'success' }, // 历史有、画布已删
  ];

  it('只保留画布仍存在的节点；matched/total 反映匹配度', () => {
    const plan = planReplayDistribution(records, ['start_0', 'llm_0', 'end_0', 'code_0']);
    expect(plan.total).toBe(4);
    expect(plan.matched).toBe(2);
    expect(plan.applied.map((r) => r.id).sort()).toEqual(['llm_0', 'start_0']);
  });

  it('画布与历史完全一致时 matched === total', () => {
    const plan = planReplayDistribution(records, ['start_0', 'llm_0', 'ghost_0']);
    expect(plan.matched).toBe(3);
    expect(plan.total).toBe(3);
  });

  it('空画布/空记录：零应用、不抛错', () => {
    expect(planReplayDistribution([], ['a'])).toEqual({ applied: [], matched: 0, total: 1 });
    expect(planReplayDistribution(records, [])).toEqual({ applied: [], matched: 0, total: 0 });
  });
});
