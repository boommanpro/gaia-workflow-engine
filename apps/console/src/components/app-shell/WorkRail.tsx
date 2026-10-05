/**
 * WorkRail —— Work 模式左栏（文件夹手风琴）。
 *
 * 与 Codex 一致：文件夹行点击展开 / 再次点击折叠，其对话历史嵌套在文件夹下方；
 * 行 hover 时右侧露出「更多（…）／新建任务（⊕）」两个按钮，
 * 「更多」弹出菜单：创建新任务 / 重命名 / 删除。
 * 整个左栏只有一个滚动容器，多个文件夹可同时展开。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { SessionList } from '../../agent/SessionList';
import { useAgent } from '../../agent/AgentContext';
import { CHAT } from '../../chat/theme';
import { useLanguage, t } from '../../i18n';
import { IconFolder } from './icons';

interface WorkRailProps {
  onSelect: (sessionKey: string) => void;
  /** 在指定文件夹内新建对话 */
  onCreateInFolder: (folderId: number) => void;
}

const PlusIcon: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** 圆形加号：文件夹行右侧的「新建任务」 */
const CirclePlusIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8.5v7M8.5 12h7" />
  </svg>
);

/** 更多：三个点 */
const MoreIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5.5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="18.5" cy="12" r="1.5" />
  </svg>
);

const TrashIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </svg>
);

const EditIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17z" />
    <path d="M13.5 6.5l3 3" />
  </svg>
);

/** 展开箭头：折叠时指向右，展开时旋转 90° 指向下 */
const ChevronIcon: React.FC<{ open: boolean; size?: number }> = ({ open, size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}
  >
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/** 弹出菜单项 */
const MenuItem: React.FC<{ danger?: boolean; onClick: () => void; children: React.ReactNode }> = ({ danger, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      border: 'none',
      background: 'transparent',
      color: danger ? CHAT.danger : CHAT.textBody,
      padding: '7px 9px',
      borderRadius: 8,
      fontSize: 12.5,
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: 'inherit',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = CHAT.hover; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
  >
    {children}
  </button>
);

export const WorkRail: React.FC<WorkRailProps> = ({ onSelect, onCreateInFolder }) => {
  useLanguage();
  const { folders, createFolder, renameFolder, deleteFolder, sessions, currentSessionKey } = useAgent();

  // 展开的文件夹（手风琴，可多个同时展开）
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const toggleFolder = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const expandFolder = useCallback((id: number) => {
    setExpanded((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  // 新建文件夹内联输入
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const newInputRef = useRef<HTMLInputElement>(null);
  // 改名内联输入（只能从「更多」菜单进入）
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  // 防止「回车 + 失焦」把同一次提交触发两遍（会重复建文件夹）
  const committedRef = useRef(false);

  // 「更多」弹出菜单（portal 到 body，避免被滚动容器裁切）
  const [menu, setMenu] = useState<{ folderId: number; pos: { top: number; left: number } } | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);

  // 当前会话所在的文件夹默认展开，避免「正在进行的对话」被折叠看不见
  useEffect(() => {
    if (!currentSessionKey) return;
    const cur = sessions.find((s) => s.sessionKey === currentSessionKey);
    if (cur && cur.folderId != null) expandFolder(cur.folderId);
  }, [currentSessionKey, sessions, expandFolder]);

  useEffect(() => {
    if (creating && newInputRef.current) newInputRef.current.focus();
  }, [creating]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // 外部点击 / Esc 关闭「更多」菜单
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      const el = document.getElementById('folder-menu');
      if (el?.contains(target)) return;
      setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const openMenu = useCallback((e: React.MouseEvent, folderId: number) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    anchorRef.current = e.currentTarget as HTMLElement;
    setMenu({ folderId, pos: { top: rect.bottom + 6, left: Math.max(8, rect.right - 184) } });
  }, []);

  const openCreate = useCallback(() => {
    committedRef.current = false;
    setCreating((v) => !v);
    setNewName('');
  }, []);

  const commitCreate = useCallback(async () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const name = newName.trim();
    setCreating(false);
    setNewName('');
    if (name) {
      try {
        const folder = await createFolder(name);
        if (folder && folder.id) expandFolder(folder.id);
      } catch { /* ignore */ }
    }
  }, [newName, createFolder, expandFolder]);

  const startRename = useCallback((id: number, name: string) => {
    committedRef.current = false;
    setEditingId(id);
    setEditingName(name);
  }, []);

  const commitRename = useCallback(async () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const name = editingName.trim();
    const id = editingId;
    setEditingId(null);
    setEditingName('');
    if (id != null && name) {
      try {
        await renameFolder(id, name);
      } catch { /* ignore */ }
    }
  }, [editingId, editingName, renameFolder]);

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm(t('shell.deleteFolderConfirm'))) return;
    try {
      await deleteFolder(id);
    } catch { /* ignore */ }
  }, [deleteFolder]);

  const rowStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    border: 'none',
    background: 'transparent',
    color: CHAT.text,
    padding: '6px 8px',
    borderRadius: 8,
    fontSize: 12.5,
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
  };

  /** 行 hover 露出的方形小按钮（与图中「… / ⊕」同款） */
  const rowBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: CHAT.textMuted,
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${CHAT.accent}`,
    borderRadius: 7,
    padding: '5px 8px',
    fontSize: 12.5,
    outline: 'none',
    background: 'var(--g-bg-raised)',
    color: CHAT.text,
    fontFamily: 'inherit',
    marginBottom: 4,
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '2px 8px 10px' }}>
      {/* 文件夹区标题 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          color: CHAT.textFaint,
          padding: '0 6px 6px',
        }}
      >
        <IconFolder />
        <span style={{ flex: 1 }}>{t('shell.workFolders')}</span>
        <button
          type="button"
          aria-label={t('shell.newFolder')}
          title={t('shell.newFolder')}
          onClick={openCreate}
          style={rowBtnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = CHAT.hover; e.currentTarget.style.color = CHAT.textSub; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = CHAT.textMuted; }}
        >
          <PlusIcon />
        </button>
      </div>

      {creating && (
        <input
          ref={newInputRef}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={() => void commitCreate()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commitCreate();
            else if (e.key === 'Escape') { committedRef.current = true; setCreating(false); setNewName(''); }
          }}
          placeholder={t('shell.folderNamePlaceholder')}
          style={inputStyle}
        />
      )}

      {/* 文件夹手风琴 */}
      {folders.map((f) => {
        const isOpen = expanded.has(f.id);
        const isEditing = editingId === f.id;
        if (isEditing) {
          return (
            <input
              key={f.id}
              ref={editInputRef}
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => void commitRename()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void commitRename();
                else if (e.key === 'Escape') { committedRef.current = true; setEditingId(null); setEditingName(''); }
              }}
              style={inputStyle}
            />
          );
        }
        return (
          <div key={f.id}>
            <div
              role="button"
              aria-expanded={isOpen}
              onClick={() => toggleFolder(f.id)}
              style={{
                ...rowStyle,
                ...(isOpen ? { background: CHAT.hover, color: CHAT.text } : null),
                marginBottom: 1,
              }}
              onMouseEnter={(e) => {
                if (!isOpen) e.currentTarget.style.background = CHAT.hover;
                const acts = e.currentTarget.querySelector('.folder-actions') as HTMLElement | null;
                if (acts) acts.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                if (!isOpen) e.currentTarget.style.background = 'transparent';
                const acts = e.currentTarget.querySelector('.folder-actions') as HTMLElement | null;
                if (acts) acts.style.opacity = '0';
              }}
            >
              <span style={{ display: 'flex', flexShrink: 0, color: CHAT.textMuted, width: 12 }}>
                <ChevronIcon open={isOpen} />
              </span>
              <span style={{ display: 'flex', flexShrink: 0, color: isOpen ? CHAT.text : CHAT.textMuted }}>
                <IconFolder size={13} />
              </span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.name}
              </span>
              <span
                className="folder-actions"
                style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, opacity: 0, transition: 'opacity .12s' }}
              >
                {/* 更多：创建新任务 / 重命名 / 删除 */}
                <button
                  type="button"
                  aria-label={t('shell.moreActions')}
                  title={t('shell.moreActions')}
                  onClick={(e) => openMenu(e, f.id)}
                  style={rowBtnStyle}
                  onMouseEnter={(e) => { e.currentTarget.style.background = CHAT.bgRaised; e.currentTarget.style.color = CHAT.textSub; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = CHAT.textMuted; }}
                >
                  <MoreIcon />
                </button>
                {/* 在文件夹内新建对话 */}
                <button
                  type="button"
                  aria-label={t('shell.newSessionInFolder')}
                  title={t('shell.newSessionInFolder')}
                  onClick={(e) => { e.stopPropagation(); expandFolder(f.id); onCreateInFolder(f.id); }}
                  style={rowBtnStyle}
                  onMouseEnter={(e) => { e.currentTarget.style.background = CHAT.bgRaised; e.currentTarget.style.color = CHAT.textSub; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = CHAT.textMuted; }}
                >
                  <CirclePlusIcon />
                </button>
              </span>
            </div>

            {/* 展开时的嵌套会话历史 */}
            {isOpen && (
              <SessionList
                hideChrome
                variant="nested"
                onSelect={onSelect}
                filter={(s) => (s.scope || 'chat') === 'work' && s.folderId === f.id}
              />
            )}
          </div>
        );
      })}

      {folders.length === 0 && !creating && (
        <div style={{ padding: '10px 8px', fontSize: 12, color: CHAT.textFaint }}>
          {t('shell.workNoFolder')}
        </div>
      )}

      {/* 「更多」菜单（portal 到 body，避免被滚动容器裁切） */}
      {menu &&
        createPortal(
          <div
            id="folder-menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: menu.pos.top,
              left: menu.pos.left,
              width: 184,
              background: CHAT.bgRaised,
              border: `1px solid ${CHAT.line}`,
              borderRadius: 12,
              boxShadow: CHAT.panelShadow,
              padding: 6,
              zIndex: 1500,
            }}
          >
            <MenuItem
              onClick={() => {
                const id = menu.folderId;
                setMenu(null);
                expandFolder(id);
                onCreateInFolder(id);
              }}
            >
              <span style={{ display: 'flex', color: CHAT.textMuted }}><PlusIcon size={14} /></span>
              {t('shell.folderNewTask')}
            </MenuItem>
            <MenuItem
              onClick={() => {
                const target = folders.find((x) => x.id === menu.folderId);
                setMenu(null);
                if (target) startRename(target.id, target.name);
              }}
            >
              <span style={{ display: 'flex', color: CHAT.textMuted }}><EditIcon /></span>
              {t('shell.renameFolder')}
            </MenuItem>
            <div style={{ height: 1, background: CHAT.lineSoft, margin: '4px 4px' }} />
            <MenuItem
              danger
              onClick={() => {
                const id = menu.folderId;
                setMenu(null);
                void handleDelete(id);
              }}
            >
              <span style={{ display: 'flex' }}><TrashIcon /></span>
              {t('Delete')}
            </MenuItem>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default WorkRail;
