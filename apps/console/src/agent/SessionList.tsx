/**
 * SessionList - 会话列表
 *
 * 交互上遵循两个常识：改名不该是隐藏手势（双击），删除不该没有提示。
 * 所以每行 hover 时露出「改名 / 删除」两个图标，改名进内联输入态。
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button, Tooltip } from '@douyinfe/semi-ui';
import { IconPlus, IconDelete, IconEdit } from '@douyinfe/semi-icons';

import { useAgent } from './AgentContext';
import { useLanguage, t } from '../i18n';
import { CHAT } from '../chat/theme';

interface SessionListProps {
  onClose?: () => void;
  /**
   * 用户主动选中某段会话。传了就完全接管（由调用方决定要不要切、要不要顺便改 URL），
   * 不传则退回默认行为：直接 switchSession。
   */
  onSelect?: (sessionKey: string) => void;
  /** 新建会话。传了就接管，否则默认 createSession。 */
  onCreate?: () => void;
  /** 隐藏自带标题与底部新建按钮（外层侧栏自己提供这类外框） */
  hideChrome?: boolean;
}

/** 会话时间：今天只给时分，更早给日期 */
function formatWhen(value?: string): string {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  if (sameDay) return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}/${date.getDate()}`;
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

const RowAction: React.FC<{ title: string; danger?: boolean; onClick: () => void; children: React.ReactNode }> = ({
  title,
  danger,
  onClick,
  children,
}) => (
  <Tooltip content={title} position="top">
    <button
      type="button"
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 22,
        height: 22,
        border: 'none',
        borderRadius: 6,
        background: 'transparent',
        color: CHAT.textMuted,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#fff';
        e.currentTarget.style.color = danger ? CHAT.danger : CHAT.textSub;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = CHAT.textMuted;
      }}
    >
      {children}
    </button>
  </Tooltip>
);

export const SessionList: React.FC<SessionListProps> = ({ onClose, onSelect, onCreate, hideChrome }) => {
  const {
    sessions,
    currentSessionKey,
    switchSession,
    createSession,
    deleteSession,
    renameSession,
  } = useAgent();
  useLanguage();

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingKey && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingKey]);

  const startEdit = useCallback((key: string, title: string) => {
    setEditingKey(key);
    setEditingTitle(title);
  }, []);

  const commitEdit = useCallback(() => {
    if (editingKey) {
      const trimmed = editingTitle.trim();
      if (trimmed) void renameSession(editingKey, trimmed);
      setEditingKey(null);
    }
  }, [editingKey, editingTitle, renameSession]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commitEdit();
      else if (e.key === 'Escape') setEditingKey(null);
    },
    [commitEdit]
  );

  const handleSelect = useCallback(
    (key: string) => {
      if (key === currentSessionKey) {
        onClose?.();
        return;
      }
      if (onSelect) onSelect(key);
      else void switchSession(key);
      onClose?.();
    },
    [currentSessionKey, switchSession, onClose, onSelect]
  );

  const handleNew = useCallback(() => {
    if (onCreate) onCreate();
    else void createSession();
    onClose?.();
  }, [createSession, onCreate, onClose]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'transparent' }}>
      {!hideChrome && (
        <div
          style={{
            padding: '0 14px',
            height: 36,
            display: 'flex',
            alignItems: 'center',
            fontSize: 11,
            color: CHAT.textMuted,
            fontWeight: 600,
            letterSpacing: '0.06em',
            flexShrink: 0,
          }}
        >
          {t('agent.sessionList')}
        </div>
      )}

      <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '2px 8px 8px' }}>
        {sessions.length === 0 ? (
          <div style={{ padding: '28px 8px', textAlign: 'center', fontSize: 12, color: CHAT.textFaint }}>
            {t('agent.noSession')}
          </div>
        ) : (
          sessions.map((s) => {
            const isCurrent = s.sessionKey === currentSessionKey;
            const isEditing = editingKey === s.sessionKey;
            const when = formatWhen(s.updatedAt || s.createdAt);
            return (
              <div
                key={s.sessionKey}
                onClick={() => !isEditing && handleSelect(s.sessionKey)}
                title={s.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  borderRadius: 9,
                  marginBottom: 2,
                  cursor: isEditing ? 'default' : 'pointer',
                  background: isCurrent ? CHAT.accentSoft : 'transparent',
                  color: isCurrent ? CHAT.accent : CHAT.textBody,
                  transition: 'background .12s',
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent) e.currentTarget.style.background = CHAT.hover;
                  const actions = e.currentTarget.querySelector('.row-actions') as HTMLElement | null;
                  if (actions) actions.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) e.currentTarget.style.background = 'transparent';
                  const actions = e.currentTarget.querySelector('.row-actions') as HTMLElement | null;
                  if (actions) actions.style.opacity = '0';
                }}
              >
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={handleEditKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: `1px solid ${CHAT.accent}`,
                      borderRadius: 6,
                      padding: '3px 7px',
                      fontSize: 13,
                      outline: 'none',
                      background: '#fff',
                      color: CHAT.text,
                      fontFamily: 'inherit',
                    }}
                  />
                ) : (
                  <>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 13,
                        fontWeight: isCurrent ? 600 : 400,
                      }}
                    >
                      {s.title || t('agent.unnamedSession')}
                    </span>

                    {when && (
                      <span
                        className="row-when"
                        style={{ fontSize: 10.5, color: CHAT.textFaint, flexShrink: 0 }}
                      >
                        {when}
                      </span>
                    )}

                    <span
                      className="row-actions"
                      style={{ display: 'flex', gap: 0, opacity: 0, transition: 'opacity .12s', flexShrink: 0 }}
                    >
                      <RowAction title={t('agent.renameSession')} onClick={() => startEdit(s.sessionKey, s.title)}>
                        <IconEdit size="small" />
                      </RowAction>
                      <RowAction title={t('agent.deleteSession')} danger onClick={() => void deleteSession(s.sessionKey)}>
                        <IconDelete size="small" />
                      </RowAction>
                    </span>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {!hideChrome && (
        <div style={{ padding: 8, flexShrink: 0 }}>
          <Button
            block
            theme="light"
            type="primary"
            icon={<IconPlus />}
            onClick={handleNew}
            style={{ borderRadius: 9 }}
          >
            {t('agent.newSession')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SessionList;
