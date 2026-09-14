/**
 * 工具执行确认弹窗。
 *
 * 原本内联在 AgentDockPanel 里，但「有对话的地方就该能确认」——
 * AI 工作区与专家模式侧边栏都不渲染 Dock，所以把它抽出来共享。
 * 不挂的话，后端返回 confirm 策略的工具调用会一直挂起。
 */
import React from 'react';

import { useAgent } from './AgentContext';
import { useLanguage, t } from '../i18n';
import type { ToolCallEvent } from './types';

const ACCENT = '#4d53e8';

/** 工具调用 args 摘要 */
export function summarizeArgs(args: Record<string, any>): string {
  const keys = Object.keys(args);
  if (keys.length === 0) return '(无参数)';
  const parts: string[] = [];
  for (const k of keys.slice(0, 4)) {
    let v = args[k];
    if (typeof v === 'string') {
      v = v.length > 30 ? v.slice(0, 30) + '…' : v;
    } else if (typeof v === 'object') {
      v = JSON.stringify(v);
      if (v.length > 30) v = v.slice(0, 30) + '…';
    }
    parts.push(`${k}: ${v}`);
  }
  if (keys.length > 4) parts.push(`…+${keys.length - 4}`);
  return parts.join(', ');
}

export const ConfirmModal: React.FC<{
  event: ToolCallEvent;
  onResolve: (v: boolean) => void;
  /** 侧边栏等窄容器里用 absolute；独立页面用 fixed 更稳 */
  position?: 'absolute' | 'fixed';
}> = ({ event, onResolve, position = 'absolute' }) => {
  useLanguage();

  return (
    <div
      style={{
        position,
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: '320px',
          background: '#fff',
          borderRadius: '10px',
          boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
          padding: '18px 18px 16px',
        }}
      >
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a', marginBottom: '10px' }}>
          {t('agent.confirmTitle')}
        </div>
        <div style={{ marginBottom: '6px' }}>
          <span style={{ color: '#999', fontSize: '12px' }}>{t('agent.actions')}</span>
          <span
            style={{
              marginLeft: '8px',
              color: ACCENT,
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {event.action}
          </span>
        </div>
        <div
          style={{
            background: '#f7f7fa',
            borderRadius: '6px',
            padding: '8px 10px',
            fontSize: '12px',
            color: '#555',
            marginBottom: '16px',
            wordBreak: 'break-all',
            maxHeight: '120px',
            overflowY: 'auto',
          }}
        >
          {summarizeArgs(event.args)}
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onResolve(false)}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: '1px solid #e0e0e6',
              background: '#fff',
              color: '#555',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {t('agent.confirmReject')}
          </button>
          <button
            onClick={() => onResolve(true)}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              background: ACCENT,
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t('agent.confirmApprove')}
          </button>
        </div>
      </div>
    </div>
  );
};

/** 便捷版：自己从 context 取 pendingConfirm，直接渲染（无待确认时为 null） */
export const AgentConfirmLayer: React.FC<{ position?: 'absolute' | 'fixed' }> = ({
  position,
}) => {
  const { pendingConfirm, resolveConfirm } = useAgent();
  if (!pendingConfirm) return null;
  return <ConfirmModal event={pendingConfirm} onResolve={resolveConfirm} position={position} />;
};

export default AgentConfirmLayer;
