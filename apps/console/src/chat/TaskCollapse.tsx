/**
 * TaskCollapse —— TRAE 式「任务耗时 Xs ›」折叠行（2026-10-17 二次反馈）。
 *
 * 过程性信息（思考 / 工具调用 / 系统播报）默认全部收起，正文前只留一行耗时；
 * 点击才展开看完整过程。live 模式头部带 spinner + 秒表自走，收尾定格为总耗时。
 * 取代原 ProcessFold（徽章轨迹条对普通用户仍是噪音）。
 */
import React, { useEffect, useState } from 'react';
import { IconChevronDown, IconChevronRight } from '@douyinfe/semi-icons';

import { t } from '../i18n';
import { CHAT } from './theme';

interface TaskCollapseProps {
  /** 定稿耗时（秒）。live=false 时展示它；无值时退化为「执行过程」 */
  elapsedSec?: number;
  /** 流式进行中：头部 spinner + 秒表自走（startedAt 为 run 起点，ms） */
  live?: boolean;
  startedAt?: number;
  children: React.ReactNode;
}

export const TaskCollapse: React.FC<TaskCollapseProps> = ({
  elapsedSec,
  live = false,
  startedAt,
  children,
}) => {
  // 默认收起是本组件的存在意义，不读用户偏好（本次反馈明确要默认极简）
  const [open, setOpen] = useState(false);
  /** live 秒表：500ms 心跳强制重渲染 */
  const [, tick] = useState(0);
  useEffect(() => {
    if (!live || !startedAt) return;
    const timer = setInterval(() => tick((v) => v + 1), 500);
    return () => clearInterval(timer);
  }, [live, startedAt]);

  const liveSec = live && startedAt ? Math.max(0, (Date.now() - startedAt) / 1000) : undefined;
  const sec = liveSec ?? (elapsedSec != null && elapsedSec > 0 ? elapsedSec : undefined);
  // 收尾态取整（TRAE 同款「24s」）；仅运行中的秒表在 10s 内保留一位小数，避免长时间停在 0s
  const secText = live && sec != null && sec < 10 ? sec.toFixed(1) : String(Math.round(sec ?? 0));
  const label = sec != null ? t('chat.taskElapsed', { sec: secText }) : t('chat.taskProcess');

  return (
    <div style={{ margin: '2px 0 8px', minWidth: 0 }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 24,
          minWidth: 0,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          padding: 0,
          color: 'var(--g-text-faint)',
          transition: 'color .12s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--g-text-sub)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.color = 'var(--g-text-faint)'; }}
      >
        {live ? (
          <span
            aria-hidden
            style={{
              flex: 'none',
              width: 10,
              height: 10,
              border: `1.5px solid ${CHAT.line}`,
              borderTopColor: CHAT.accent,
              borderRadius: '50%',
              animation: 'chat-spin .9s linear infinite',
              display: 'inline-block',
            }}
          />
        ) : null}
        <span style={{ flex: 'none', fontSize: 12.5, lineHeight: '24px' }}>{label}</span>
        <span style={{ flex: 'none', display: 'inline-flex', color: 'var(--g-text-faint)', opacity: open ? 1 : 0.55 }}>
          {open ? <IconChevronDown size="small" /> : <IconChevronRight size="small" />}
        </span>
      </button>
      {open && <div style={{ padding: '4px 0 2px', minWidth: 0 }}>{children}</div>}
    </div>
  );
};

export default TaskCollapse;
