/**
 * NewTaskChips —— 新任务的「随行选项」chips（嵌在欢迎态输入卡顶部，替代原任务设置面板）。
 *
 * 新建任务不弹窗：选项收敛为两枚 chips，默认值由入口带入（上次会话的项目与其绑定
 * 工作流），用户发出第一条消息时才生效——归属项目随 /session/create 落库，
 * 起点决定 seed-draft（按工作流落版）或 push-draft（携带草稿快照）。
 * 「换新会话继续」带入的草稿快照显示为可撤销（×）的携带态，撤销即回到空白；
 * 一旦显式改选工作流，快照即被丢弃（updateDraftSetup 的既有语义）。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Popover } from '@douyinfe/semi-ui';
import {
  IconBranch,
  IconChevronDown,
  IconClose,
  IconFolder,
  IconFolderOpen,
  IconPaperclip,
  IconPlus,
  IconSearch,
  IconTick,
} from '@douyinfe/semi-icons';

import { useAgent } from '../../agent/AgentContext';
import { workflowApi, type GaiaWorkflow } from '../../services/workflow-api';
import { CHAT } from '../../chat/theme';
import { useLanguage, t } from '../../i18n';

interface NewTaskChipsProps {
  setup: { folderId: number | null; inheritWorkflowCode: string | null; carryDraft?: boolean };
  onChange: (patch: { folderId?: number | null; inheritWorkflowCode?: string | null }) => void;
}

/** 工作流行右侧的次要信息：今天给「今天」，同年给 M/D，跨年给 Y/M/D（与会话列表同风格） */
function formatWorkflowDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return t('newTask.updatedToday');
  if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}/${date.getDate()}`;
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 30,
  padding: '0 12px',
  borderRadius: 8,
  border: `1px solid ${CHAT.line}`,
  background: 'transparent',
  fontSize: 12.5,
  color: CHAT.textSub,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'border-color .14s, background .14s, color .14s',
};

const optRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  textAlign: 'left',
  padding: '7px 9px',
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  fontSize: 12.5,
  color: CHAT.textBody,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const optIconStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  color: CHAT.textMuted,
  flexShrink: 0,
};

const captionStyle: React.CSSProperties = {
  padding: '5px 9px 3px',
  fontSize: 11,
  color: CHAT.textFaint,
};

const footStyle: React.CSSProperties = {
  padding: '6px 9px 4px',
  fontSize: 11,
  color: CHAT.textFaint,
  lineHeight: 1.5,
};

/** hover 提亮（仓库惯例：inline style + 手写 hover，不引全局 class） */
function bindHover(el: HTMLElement, picked = false): void {
  el.style.background = picked ? CHAT.accentSoft : 'transparent';
  el.addEventListener('mouseenter', () => {
    el.style.background = CHAT.hover;
  });
  el.addEventListener('mouseleave', () => {
    el.style.background = picked ? CHAT.accentSoft : 'transparent';
  });
}

export const NewTaskChips: React.FC<NewTaskChipsProps> = ({ setup, onChange }) => {
  useLanguage();
  const { folders } = useAgent();
  const [workflows, setWorkflows] = useState<GaiaWorkflow[]>([]);
  const [folderOpen, setFolderOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [keyword, setKeyword] = useState('');

  const inherit = setup.inheritWorkflowCode != null;
  const carry = inherit && !!setup.carryDraft;

  // 挂载即拉工作流列表：chip 标签要把默认继承的 code 显示成名称，不能等打开弹层再拉
  useEffect(() => {
    let alive = true;
    workflowApi.listWorkflows()
      .then((list) => {
        if (alive) setWorkflows(list || []);
      })
      .catch(() => { /* 展示层降级为 code；提交阶段由物化链路兜底 */ });
    return () => {
      alive = false;
    };
  }, []);

  const workflowName = useMemo(() => {
    if (!setup.inheritWorkflowCode) return '';
    const hit = workflows.find((w) => w.workflowCode === setup.inheritWorkflowCode);
    return hit?.workflowName || setup.inheritWorkflowCode;
  }, [workflows, setup.inheritWorkflowCode]);

  const folderLabel = useMemo(() => {
    if (setup.folderId == null) return t('admin.workflow.unfiled');
    return folders.find((f) => f.id === setup.folderId)?.name || t('admin.workflow.unfiled');
  }, [folders, setup.folderId]);

  const startLabel = carry
    ? `${t('newTask.carryDraftChip')} · ${workflowName}`
    : inherit
      ? `${t('newTask.inheritPrefix')} · ${workflowName}`
      : t('newTask.blank');

  const filteredWorkflows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter(
      (w) =>
        w.workflowName.toLowerCase().includes(q) ||
        w.workflowCode.toLowerCase().includes(q)
    );
  }, [workflows, keyword]);

  const footText = carry ? t('newTask.carryDraftDesc') : t('newTask.inheritDesc');

  const folderOptions = (
    <div style={{ width: 220 }}>
      {[
        { id: null as number | null, name: t('admin.workflow.unfiled') },
        ...folders.map((f) => ({ id: f.id as number | null, name: f.name })),
      ].map((opt) => {
        const picked = setup.folderId === opt.id;
        return (
          <button
            key={opt.id ?? 'unfiled'}
            type="button"
            ref={(el) => {
              if (el) bindHover(el, picked);
            }}
            style={{ ...optRowStyle, ...(picked ? { background: CHAT.accentSoft } : {}) }}
            onClick={() => {
              if (setup.folderId !== opt.id) onChange({ folderId: opt.id });
              setFolderOpen(false);
            }}
          >
            {opt.id == null ? (
              <span style={optIconStyle}><IconFolderOpen /></span>
            ) : (
              <span style={optIconStyle}><IconFolder /></span>
            )}
            <span>{opt.name}</span>
            {picked && (
              <span style={{ ...optIconStyle, marginLeft: 'auto', color: CHAT.text }}>
                <IconTick />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const startOptions = (
    <div style={{ width: 292 }}>
      <button
        type="button"
        ref={(el) => {
          if (el) bindHover(el, !inherit);
        }}
        style={{ ...optRowStyle, ...(!inherit ? { background: CHAT.accentSoft } : {}) }}
        onClick={() => {
          if (inherit) onChange({ inheritWorkflowCode: null });
          setStartOpen(false);
        }}
      >
        <span style={optIconStyle}><IconPlus /></span>
        <span>{t('newTask.blank')}</span>
        {!inherit && (
          <span style={{ ...optIconStyle, marginLeft: 'auto', color: CHAT.text }}>
            <IconTick />
          </span>
        )}
      </button>

      {setup.carryDraft && (
        <>
          <div style={{ height: 1, background: CHAT.lineSoft, margin: '5px 4px' }} />
          <div style={captionStyle}>{t('newTask.lastSessionCaption')}</div>
          <button
            type="button"
            ref={(el) => {
              if (el) bindHover(el, carry);
            }}
            style={{ ...optRowStyle, ...(carry ? { background: CHAT.accentSoft } : {}) }}
            onClick={() => setStartOpen(false)}
          >
            <span style={optIconStyle}><IconPaperclip /></span>
            <span>{`${t('newTask.carryDraftChip')} · ${workflowName}`}</span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 10.5,
                padding: '1px 6px',
                borderRadius: 5,
                background: CHAT.accentSoft,
                border: `1px solid ${CHAT.accentBorder}`,
                color: CHAT.textSub,
                whiteSpace: 'nowrap',
              }}
            >
              {t('newTask.draftBadge')}
            </span>
          </button>
        </>
      )}

      <div style={{ height: 1, background: CHAT.lineSoft, margin: '5px 4px' }} />
      <div style={captionStyle}>{t('newTask.inherit')}</div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          margin: '4px 4px 6px',
          padding: '0 9px',
          height: 30,
          borderRadius: 8,
          border: `1px solid ${CHAT.line}`,
          background: CHAT.bg,
        }}
      >
        <span style={{ ...optIconStyle, color: CHAT.textFaint }}><IconSearch /></span>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={t('newTask.workflowSearch')}
          aria-label={t('newTask.workflowSearch')}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'inherit',
            fontSize: 12.5,
            color: CHAT.text,
            width: '100%',
          }}
        />
      </div>
      <div style={{ maxHeight: 196, overflowY: 'auto' }}>
        {filteredWorkflows.map((w) => {
          const picked = inherit && !setup.carryDraft && setup.inheritWorkflowCode === w.workflowCode;
          const meta = formatWorkflowDate(w.updatedAt || w.createdAt);
          return (
            <button
              key={w.workflowCode}
              type="button"
              ref={(el) => {
                if (el) bindHover(el, picked);
              }}
              style={{ ...optRowStyle, ...(picked ? { background: CHAT.accentSoft } : {}) }}
              onClick={() => {
                onChange({ inheritWorkflowCode: w.workflowCode });
                setStartOpen(false);
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {w.workflowName}
              </span>
              {meta && (
                <span style={{ marginLeft: 'auto', fontSize: 11.5, color: CHAT.textFaint, whiteSpace: 'nowrap' }}>
                  {meta}
                </span>
              )}
              {picked && (
                <span style={{ ...optIconStyle, color: CHAT.text, marginLeft: meta ? 6 : 'auto' }}>
                  <IconTick />
                </span>
              )}
            </button>
          );
        })}
        {filteredWorkflows.length === 0 && (
          <div style={{ ...captionStyle, padding: '9px 9px 7px' }}>
            {t('newTask.workflowEmpty')}
          </div>
        )}
      </div>
      <div style={footStyle}>{footText}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Popover
        trigger="click"
        position="bottomLeft"
        showArrow={false}
        visible={folderOpen}
        onVisibleChange={(v) => setFolderOpen(v)}
        content={folderOptions}
        style={{ padding: 6, background: 'var(--g-bg-raised)' }}
      >
        <button
          type="button"
          title={t('newTask.project')}
          style={chipStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = CHAT.accentBorder;
            e.currentTarget.style.background = CHAT.accentSoft;
            e.currentTarget.style.color = CHAT.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = CHAT.line;
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = CHAT.textSub;
          }}
        >
          <span style={optIconStyle}><IconFolder /></span>
          <span>{folderLabel}</span>
          <span style={{ ...optIconStyle, width: 12, height: 12 }}><IconChevronDown size="small" /></span>
        </button>
      </Popover>

      <Popover
        trigger="click"
        position="bottomLeft"
        showArrow={false}
        visible={startOpen}
        onVisibleChange={(v) => {
          setStartOpen(v);
          if (v) setKeyword('');
        }}
        content={startOptions}
        style={{ padding: 6, background: 'var(--g-bg-raised)' }}
      >
        <button
          type="button"
          title={t('newTask.startMode')}
          style={chipStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = CHAT.accentBorder;
            e.currentTarget.style.background = CHAT.accentSoft;
            e.currentTarget.style.color = CHAT.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = CHAT.line;
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = CHAT.textSub;
          }}
        >
          <span style={optIconStyle}>
            {carry ? <IconPaperclip /> : inherit ? <IconBranch /> : <IconPlus />}
          </span>
          <span>{startLabel}</span>
          {carry ? (
            <span
              role="button"
              title={t('newTask.dropDraft')}
              aria-label={t('newTask.dropDraft')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: '50%',
                color: CHAT.textMuted,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onChange({ inheritWorkflowCode: null });
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = CHAT.hover;
                e.currentTarget.style.color = CHAT.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = CHAT.textMuted;
              }}
            >
              <IconClose size="small" />
            </span>
          ) : (
            <span style={{ ...optIconStyle, width: 12, height: 12 }}>
              <IconChevronDown size="small" />
            </span>
          )}
        </button>
      </Popover>

      <span style={{ marginLeft: 'auto', fontSize: 11.5, color: CHAT.textFaint }}>
        {t('newTask.settingsHint')}
      </span>
    </div>
  );
};

export default NewTaskChips;
