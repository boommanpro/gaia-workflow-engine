/**
 * AppRail —— 应用态侧边栏（对话优先 IA）。
 *
 * 结构：【新建任务 / 工作流管理（同款导航行）】→【项目列表（任务按项目分组）】。
 * 新建任务不弹窗：直接进入空白任务（draft- 草稿会话），选项在欢迎页的
 * 「任务设置」面板里调，发出第一条消息时生效。
 * 偏后台的能力（模板管理 / Agent 配置中心）在左下角「设置」二级区，不在这里出现。
 */
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ProjectRail } from './ProjectRail';
import { useAgent } from '../../agent/AgentContext';
import { getWorkflowOfSession } from '../../ai-workspace/session-scope';
import { CHAT } from '../../chat/theme';
import { useLanguage, t } from '../../i18n';

/** 带加号的对话气泡：新建任务 */
const IconChatPlus: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M12 7v6M9 10h6" />
  </svg>
);

const IconWorkflow: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="13" width="7" height="8" rx="1.5" />
    <path d="M10 6.5h4M10 6.5a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2" />
  </svg>
);

export const AppRail: React.FC = () => {
  useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { createSession, sessions, currentSessionKey } = useAgent();
  const workflowsActive = location.pathname.startsWith('/workflows');

  /**
   * 新建任务：建一个 draft- 草稿会话并跳到对话页。默认携带上一次对话的上下文——
   *   顶部入口：当前对话（若是真实会话）的项目 + 其绑定的工作流；
   *   项目 ⊕ ：该项目最近一次对话的工作流；
   * 选项在欢迎页「任务设置」可改，首条消息发送时才物化生效。
   */
  const startNewTask = (folderId: number | null) => {
    let ref = null;
    if (folderId != null) {
      ref = sessions.find((s) => s.folderId === folderId) || null;
    } else if (currentSessionKey && !currentSessionKey.startsWith('draft-')) {
      ref = sessions.find((s) => s.sessionKey === currentSessionKey) || null;
    }
    if (!ref) ref = sessions[0] || null;
    const resolvedFolder = folderId != null ? folderId : ref?.folderId ?? null;
    const inheritCode = ref ? getWorkflowOfSession(ref.sessionKey) : null;
    if (location.pathname !== '/chat') navigate('/chat');
    void createSession(undefined, {
      scope: resolvedFolder != null ? 'work' : 'chat',
      folderId: resolvedFolder,
      inheritWorkflowCode: inheritCode,
    });
  };

  /** 与主导航行同款的按钮样式（active = 选中态底色） */
  const navBtnStyle = (active: boolean): React.CSSProperties => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: 'none',
    background: active ? CHAT.hover : 'transparent',
    boxShadow: active ? `inset 0 0 0 1px ${CHAT.line}` : 'none',
    padding: '8px 10px',
    borderRadius: 9,
    fontSize: 13,
    fontWeight: 400,
    color: CHAT.text,
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    transition: 'background .14s',
  });
  const navHoverHandlers = (active: boolean) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!active) e.currentTarget.style.background = CHAT.hover;
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!active) e.currentTarget.style.background = 'transparent';
    },
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 主导航：新建任务（进入空白任务态）+ 工作流管理 */}
      <nav style={{ padding: '0 8px 10px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => startNewTask(null)}
          style={navBtnStyle(false)}
          {...navHoverHandlers(false)}
        >
          <IconChatPlus />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t('shell.newTask')}
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/workflows')}
          style={navBtnStyle(workflowsActive)}
          {...navHoverHandlers(workflowsActive)}
        >
          <IconWorkflow />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t('admin.workflows')}
          </span>
        </button>
      </nav>

      {/* 项目列表（任务按项目分组） */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <ProjectRail
          onSelect={(key) => navigate(`/chat/${key}`)}
          onNewTask={startNewTask}
        />
      </div>
    </div>
  );
};

export default AppRail;
