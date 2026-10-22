/**
 * NewTaskSetupPanel —— 新任务的「任务设置」面板（欢迎页内联，替代原弹窗）。
 *
 * 新建任务不再弹窗：点击后直接进入空白任务（draft- 草稿会话），选项在这里调，
 * 用户发出第一条消息时才生效——归属项目落进会话 folderId，
 * 「继承已有工作流」则 seedDraft 携带其当前落版。
 */
import React, { useEffect, useState } from 'react';

import { useAgent } from '../../agent/AgentContext';
import { workflowApi, type GaiaWorkflow } from '../../services/workflow-api';
import { CHAT } from '../../chat/theme';
import { useLanguage, t } from '../../i18n';

interface NewTaskSetupPanelProps {
  setup: { folderId: number | null; inheritWorkflowCode: string | null };
  onChange: (patch: { folderId?: number | null; inheritWorkflowCode?: string | null }) => void;
}

const selectStyle: React.CSSProperties = {
  padding: '6px 9px',
  background: 'var(--g-bg-raised)',
  border: `1px solid ${CHAT.line}`,
  borderRadius: 8,
  fontSize: 12.5,
  color: CHAT.text,
  outline: 'none',
  fontFamily: 'inherit',
  maxWidth: 260,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: CHAT.textSub,
  flexShrink: 0,
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

  // 切到「继承」但还没选工作流时默认选第一个，避免带着空选择发起会话
  useEffect(() => {
    if (inherit && workflows.length > 0 && !setup.inheritWorkflowCode) {
      onChange({ inheritWorkflowCode: workflows[0].workflowCode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inherit, workflows]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 12,
        border: `1px solid ${CHAT.lineSoft}`,
        background: 'var(--g-bg-raised)',
        maxWidth: 640,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 所属项目 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={labelStyle}>{t('newTask.project')}</span>
        <select
          value={setup.folderId == null ? '' : String(setup.folderId)}
          onChange={(e) => onChange({ folderId: e.target.value === '' ? null : Number(e.target.value) })}
          style={selectStyle}
        >
          <option value="">{t('admin.workflow.unfiled')}</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* 起点：空白 / 继承已有工作流 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={labelStyle}>{t('newTask.startMode')}</span>
        <div style={{ display: 'flex', gap: 6 }}>
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
                border: `1px solid ${opt.active ? CHAT.accentBorder : CHAT.line}`,
                background: opt.active ? CHAT.accentSoft : 'transparent',
                color: opt.active ? CHAT.accent : CHAT.textSub,
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: 12.5,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {inherit && (
          <select
            value={setup.inheritWorkflowCode || ''}
            onChange={(e) => onChange({ inheritWorkflowCode: e.target.value || null })}
            style={{ ...selectStyle, flex: 1, minWidth: 180 }}
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

      {inherit && (
        <div style={{ fontSize: 11.5, color: CHAT.textMuted, paddingLeft: 2 }}>
          {t('newTask.inheritDesc')}
        </div>
      )}
    </div>
  );
};

export default NewTaskSetupPanel;
