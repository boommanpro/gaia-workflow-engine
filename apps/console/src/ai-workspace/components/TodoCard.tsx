/**
 * TodoCard —— 任务清单固定卡（2026-10-17 反馈重构）。
 *
 * <p>对标 dsh/codex/zcode 的 todo 体验：不再作为消息卡埋在对话流里，
 * 而是<strong>固定悬浮在对话区顶部</strong>的紧凑清单——
 * 头部「任务清单 · 完成/总数」+ 折叠按钮，行内 ✓/▶/○ 状态。</p>
 *
 * 2026-10-17 视觉对齐对话重构：token 配色（去掉硬编码品牌蓝）、chip 式进度、
 * running 用旋转环、done 用对勾，与消息流里的执行过程折叠条同一观感。
 */
import React, { useState } from 'react';
import type { PlanStep } from '../../agent/types';

const successColor = 'var(--g-success, #1a7f37)';
const dangerColor = 'var(--g-danger, #d1242f)';

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    style={{
      flexShrink: 0,
      color: 'var(--g-text-muted, #8f8f8f)',
      transition: 'transform .16s',
      transform: open ? 'rotate(180deg)' : 'none',
    }}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={successColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/** 运行中状态的小旋转环 */
const RunRing: React.FC = () => (
  <span
    aria-hidden
    style={{
      width: 10,
      height: 10,
      borderRadius: '50%',
      border: '1.5px solid var(--g-line, #ececec)',
      borderTopColor: 'var(--g-text-sub, #5d5d5d)',
      animation: 'chat-spin .9s linear infinite',
      display: 'inline-block',
      flexShrink: 0,
    }}
  />
);

const StepIcon: React.FC<{ status: PlanStep['status'] | undefined }> = ({ status }) => {
  if (status === 'done') return <CheckIcon />;
  if (status === 'running' || status === 'testing') return <RunRing />;
  if (status === 'error' || status === 'testFailed') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={dangerColor} strokeWidth="2.2" strokeLinecap="round" aria-hidden style={{ flexShrink: 0 }}>
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    );
  }
  return (
    <span
      aria-hidden
      style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0, margin: '1px 2px',
        border: '1.5px solid var(--g-text-faint, #b8b8b8)', display: 'inline-block',
      }}
    />
  );
};

const ListIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, color: 'var(--g-text-muted, #8f8f8f)' }}>
    <path d="M3 6l1.5 1.5L7 5" />
    <path d="M3 12l1.5 1.5L7 11" />
    <path d="M11 6h10" />
    <path d="M11 12h10" />
    <path d="M11 18h10" />
    <path d="M3 18l1.5 1.5L7 17" />
  </svg>
);

export const TodoCard: React.FC<{ steps: PlanStep[] }> = ({ steps }) => {
  // 默认折叠：仅展示最新事件（正在执行的步骤或最近变更的步骤），点击展开看全部
  const [collapsed, setCollapsed] = useState(true);
  const done = steps.filter((s) => s.status === 'done').length;
  const runningIdx = steps.findIndex((s) => s.status === 'running' || s.status === 'testing');
  const allDone = done === steps.length && steps.length > 0;

  const latest = latestEventStep(steps);

  return (
    <div
      data-testid="todo-card"
      style={{
        border: `1px solid var(--g-line, #ececec)`,
        borderRadius: 12,
        background: 'var(--g-bg-raised, #fff)',
        boxShadow: '0 2px 10px rgba(15, 15, 20, 0.08)',
        overflow: 'hidden',
        width: 260,
      }}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <ListIcon />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--g-text, #0d0d0d)' }}>任务清单</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
            color: allDone ? successColor : 'var(--g-text-sub, #5d5d5d)',
            border: `1px solid var(--g-line, #ececec)`,
            borderRadius: 999,
            padding: '0 8px',
            lineHeight: '18px',
          }}
        >
          {done}/{steps.length}
        </span>
        {runningIdx >= 0 && !collapsed && (
          <span style={{ fontSize: 12, color: 'var(--g-text-sub, #5d5d5d)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {steps[runningIdx].intent}
          </span>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center' }}>
          <Chevron open={!collapsed} />
        </span>
      </button>
      {collapsed ? (
        latest && (
          <div style={{ padding: '0 12px 9px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
            <StepIcon status={latest.status} />
            <span style={{ color: 'var(--g-text-sub, #303030)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {latest.intent}
            </span>
          </div>
        )
      ) : (
        <div style={{ padding: '2px 12px 9px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {steps.map((step) => (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5 }}>
              <StepIcon status={step.status} />
              <span
                style={{
                  color:
                    step.status === 'done'
                      ? 'var(--g-text-muted, #8f8f8f)'
                      : 'var(--g-text, #0d0d0d)',
                  textDecoration: step.status === 'done' ? 'line-through' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.intent}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** 最新事件：正在执行的步骤优先，否则最后一个非 pending 的步骤 */
function latestEventStep(steps: PlanStep[]): PlanStep | null {
  const running = steps.find((s) => s.status === 'running' || s.status === 'testing');
  if (running) return running;
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].status !== 'pending') return steps[i];
  }
  return steps[0] ?? null;
}

/** 从消息列表提取最新的任务清单步骤（取最后一条非空 planSteps） */
export function extractLatestTodoSteps(
  messages: { planSteps?: PlanStep[] }[]
): PlanStep[] | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const steps = messages[i].planSteps;
    if (steps && steps.length > 0) {
      return steps;
    }
  }
  return null;
}
