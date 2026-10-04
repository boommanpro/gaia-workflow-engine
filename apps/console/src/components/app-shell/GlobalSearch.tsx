/**
 * GlobalSearch —— ⌘/Ctrl + K 唤起的全局搜索面板（命令面板式）。
 *
 * 统一搜索三类对象：会话 / 工作流 / 模板。
 * 打开时并行拉取，任一失败不影响其余；键盘 ↑↓ 选择、Enter 打开、Esc 关闭。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSearch } from '@douyinfe/semi-icons';

import { agentApi } from '../../agent/api';
import { workflowApi } from '../../services/workflow-api';
import { CHAT } from '../../chat/theme';
import { useLanguage, t } from '../../i18n';
import { IconChatLine, IconManageSliders, IconWorkFolder } from './icons';

type SearchGroup = 'session' | 'workflow' | 'template';

interface SearchItem {
  group: SearchGroup;
  key: string;
  title: string;
  sub: string;
}

const GROUP_ORDER: SearchGroup[] = ['session', 'workflow', 'template'];
const GROUP_LABEL_KEY: Record<SearchGroup, string> = {
  session: 'shell.searchGroupSessions',
  workflow: 'shell.searchGroupWorkflows',
  template: 'shell.searchGroupTemplates',
};

const GROUP_ICON: Record<SearchGroup, React.ReactNode> = {
  session: <IconChatLine size={15} />,
  workflow: <IconWorkFolder size={15} />,
  template: <IconManageSliders size={15} />,
};

export interface GlobalSearchProps {
  visible: boolean;
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ visible, onClose }) => {
  useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 每次打开都重新拉取一次，保证结果新鲜；关闭时清空输入
  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setActive(0);
    setLoading(true);
    Promise.allSettled([
      agentApi.listSessions(),
      workflowApi.listWorkflows(),
      workflowApi.listTemplates(),
    ])
      .then(([sessions, workflows, templates]) => {
        const next: SearchItem[] = [];
        if (sessions.status === 'fulfilled') {
          sessions.value.forEach((s) =>
            next.push({
              group: 'session',
              key: s.sessionKey,
              title: s.title || t('agent.unnamedSession'),
              sub: s.sessionKey,
            })
          );
        }
        if (workflows.status === 'fulfilled') {
          workflows.value.forEach((w) =>
            next.push({ group: 'workflow', key: w.workflowCode, title: w.workflowName, sub: w.workflowCode })
          );
        }
        if (templates.status === 'fulfilled') {
          templates.value.forEach((tp) =>
            next.push({ group: 'template', key: tp.templateCode, title: tp.templateName, sub: tp.templateCode })
          );
        }
        setItems(next);
      })
      .finally(() => setLoading(false));
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [visible]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter((it) => it.title.toLowerCase().includes(q) || it.sub.toLowerCase().includes(q))
      : items;
    const limited = q ? filtered : filtered.slice(0, 24);
    return GROUP_ORDER.map((group) => ({
      group,
      items: limited.filter((it) => it.group === group),
    })).filter((g) => g.items.length > 0);
  }, [items, query]);

  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const open = (item: SearchItem) => {
    onClose();
    if (item.group === 'session') navigate(`/chat/${item.key}`);
    else if (item.group === 'workflow') navigate(`/editor/${item.key}`);
    else navigate(`/template-editor/${item.key}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((v) => (flat.length ? (v + 1) % flat.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((v) => (flat.length ? (v - 1 + flat.length) % flat.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flat[active];
      if (item) open(item);
    }
  };

  if (!visible) return null;

  let cursor = -1;

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(20,20,32,.28)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '12vh',
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        style={{
          width: 580,
          maxWidth: '92vw',
          maxHeight: '64vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--g-bg-raised)',
          borderRadius: 14,
          boxShadow: '0 18px 48px rgba(20,20,40,.22)',
          border: `1px solid ${CHAT.line}`,
          overflow: 'hidden',
        }}
      >
        {/* 搜索输入 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '12px 14px',
            borderBottom: `1px solid ${CHAT.lineSoft}`,
            flexShrink: 0,
          }}
        >
          <span style={{ display: 'flex', color: CHAT.textMuted, flexShrink: 0 }}>
            <IconSearch size="default" />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('shell.searchPlaceholder')}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 14,
              color: CHAT.text,
              fontFamily: 'inherit',
            }}
          />
          <kbd
            style={{
              fontSize: 10.5,
              color: CHAT.textFaint,
              border: `1px solid ${CHAT.line}`,
              borderRadius: 5,
              padding: '1px 5px',
              flexShrink: 0,
            }}
          >
            Esc
          </kbd>
        </div>

        {/* 结果 */}
        <div className="chat-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 6 }}>
          {loading ? (
            <div style={{ padding: '26px 8px', textAlign: 'center', fontSize: 12.5, color: CHAT.textFaint }}>
              {t('Loading')}
            </div>
          ) : flat.length === 0 ? (
            <div style={{ padding: '26px 8px', textAlign: 'center', fontSize: 12.5, color: CHAT.textFaint }}>
              {t('shell.searchEmpty')}
            </div>
          ) : (
            grouped.map((g) => (
              <div key={g.group} style={{ marginBottom: 4 }}>
                <div
                  style={{
                    padding: '6px 10px 4px',
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    color: CHAT.textFaint,
                  }}
                >
                  {t(GROUP_LABEL_KEY[g.group])}
                </div>
                {g.items.map((item) => {
                  cursor += 1;
                  const index = cursor;
                  const isActive = index === active;
                  return (
                    <button
                      key={`${item.group}-${item.key}`}
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => open(item)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        border: 'none',
                        textAlign: 'left',
                        background: isActive ? CHAT.accentSoft : 'transparent',
                        color: isActive ? CHAT.accent : CHAT.textBody,
                        padding: '8px 10px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ display: 'flex', flexShrink: 0, color: isActive ? CHAT.accent : CHAT.textMuted }}>
                        {GROUP_ICON[item.group]}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 13,
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.title}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: CHAT.textFaint,
                          flexShrink: 0,
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
