/**
 * NewTaskSetupPanel —— 新任务的「任务设置」面板（欢迎页内联，替代原弹窗）。
 *
 * 新建任务不弹窗：点击后直接进入空白任务（draft- 草稿会话），选项在这里调，
 * 用户发出第一条消息时才生效——归属项目落进会话 folderId，
 * 「继承已有工作流」则携带该工作流（或上次对话的草稿快照）进入新会话。
 * 默认值由入口带入：上次对话的项目与工作流（AppRail 解析）。
 */
import React, { useEffect, useState } from 'react';

import { useAgent } from '../../agent/AgentContext';
import { workflowApi, type GaiaWorkflow } from '../../services/workflow-api';
import { CHAT } from '../../chat/theme';
import { useLanguage, t } from '../../i18n';

interface NewTaskSetupPanelProps {
  setup: { folderId: number | null; inheritWorkflowCode: string | null; carryDraft?: boolean };
  onChange: (patch: { folderId?: number | null; inheritWorkflowCode?: string | null }) => void;
}

const labelStyle: React.CSSProperties = {
  width: 62,
  flexShrink: 0,
  fontSize: 12.5,
  color: CHAT.textSub,
};

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: 'var(--g-bg-raised)',
  border: `1px solid ${CHAT.line}`,
  borderRadius: 8,
  fontSize: 12.5,
  color: CHAT.text,
  outline: 'none',
  fontFamily: 'inherit',
  height: 32,
};

export const NewTaskSetupPanel: React.FC<NewTaskSetupPanelProps> = ({ setup, onChange }) => {
  useLanguage();
  const { folders } = useAgent();
  const [workflows, setWorkflows] = useState<GaiaWorkflow[]>([]);

  const inherit = setup.inheritWorkflowCode != null;

  // 选择「继承」时才拉工作流列表
  useEffect(() => {
    if (!inherit || workflows.length > 0) return;
    workflowApi.listWorkflows()
      .then((list) => setWorkflows(list || []))
      .catch(() => { /* 提交阶段由物化链路兜底 */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inherit]);

  // 切到「继承」但还没选工作流时默认选第一个，避免带着空选择发起会话；
  // carryDraft（换新会话继续携带的草稿快照）除外——不动选择，物化时按快照走
  useEffect(() => {
    if (inherit && workflows.length > 0 && !setup.inheritWorkflowCode && !setup.carryDraft) {
      onChange({ inheritWorkflowCode: workflows[0].workflowCode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inherit, workflows]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '14px 18px 16px',
        borderRadius: 14,
        border: `1px solid ${CHAT.lineSoft}`,
        background: 'var(--g-bg-raised)',
        boxShadow: '0 1px 3px rgba(20,20,40,.05)',
        maxWidth: 640,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: CHAT.text }}>{t('shell.newTask')}</span>
        <span style={{ fontSize: 11.5, color: CHAT.textMuted, marginLeft: 'auto' }}>
          {t('newTask.settingsHint')}
        </span>
      </div>

      {/* 所属项目 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={labelStyle}>{t('newTask.project')}</span>
        <select
          value={setup.folderId == null ? '' : String(setup.folderId)}
          onChange={(e) => onChange({ folderId: e.target.value === '' ? null : Number(e.target.value) })}
          style={{ ...selectStyle, width: 220 }}
        >
          <option value="">{t('admin.workflow.unfiled')}</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* 起点：空白 / 继承已有工作流 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={labelStyle}>{t('newTask.startMode')}</span>
        <div
          style={{
            display: 'inline-flex',
            padding: 3,
            borderRadius: 9,
            border: `1px solid ${CHAT.line}`,
            background: 'var(--g-bg-sunken, transparent)',
          }}
        >
          {[
            { key: 'blank', label: t('newTask.blank'), active: !inherit },
            { key: 'inherit', label: t('newTask.inherit'), active: inherit },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange({
                inheritWorkflowCode: opt.key === 'inherit' ? (setup.inheritWorkflowCode || '') : null,
              })}
              style={{
                border: 'none',
                padding: '5px 14px',
                borderRadius: 7,
                fontSize: 12.5,
                fontWeight: opt.active ? 500 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all .14s',
                background: opt.active ? 'var(--g-bg-raised)' : 'transparent',
                color: opt.active ? CHAT.text : CHAT.textMuted,
                boxShadow: opt.active ? '0 1px 2px rgba(20,20,40,.08)' : 'none',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {inherit && setup.carryDraft && (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200,
              fontSize: 12, color: CHAT.accent,
              background: CHAT.accentSoft,
              border: `1px solid ${CHAT.accentBorder}`,
              borderRadius: 8, padding: '5px 10px',
            }}
          >
            ✓ {t('newTask.carryDraft')}
          </span>
        )}
        {inherit && !setup.carryDraft && (
          <select
            value={setup.inheritWorkflowCode || ''}
            onChange={(e) => onChange({ inheritWorkflowCode: e.target.value || null })}
            style={{ ...selectStyle, flex: 1, minWidth: 200 }}
          >
            <option value="">{t('newTask.workflowPlaceholder')}</option>
            {workflows.map((w) => (
              <option key={w.workflowCode} value={w.workflowCode}>
                {w.workflowName}（{w.workflowCode}）
              </option>
            ))}
          </select>
        )}
      </div>

      {inherit && setup.carryDraft && (
        <div style={{ fontSize: 11.5, color: CHAT.textMuted, paddingLeft: 74, lineHeight: 1.6 }}>
          {t('newTask.carryDraftDesc')}
        </div>
      )}
      {inherit && !setup.carryDraft && (
        <div style={{ fontSize: 11.5, color: CHAT.textMuted, paddingLeft: 74, lineHeight: 1.6 }}>
          {t('newTask.inheritDesc')}
        </div>
      )}
    </div>
  );
};

export default NewTaskSetupPanel;
