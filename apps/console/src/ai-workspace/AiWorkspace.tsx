/**
 * AI 工作区 —— 对话优先 IA 的主页：以对话为核心主视角、工作流为最终产物。
 *
 * 任务即会话（Chat/Work 双 scope 已合并），项目分组的入口在左栏 AppRail：
 * 【左栏：新建任务 / 工作流管理 / 项目列表】｜【中区：对话】｜【右栏：产物】。
 * URL 即状态：会话 key 永远落在地址栏，可收藏、可分享、可前进后退。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { takeInitialPrompt, peekInitialPrompt } from '../agent/initialPrompt';
import { Tag } from '@douyinfe/semi-ui';
import { IconHistory } from '@douyinfe/semi-icons';

import { useAgent } from '../agent/AgentContext';
import { useLanguage, t } from '../i18n';
import { useWorkflowDocumentState } from '../document';
import { TodoCard, extractLatestTodoSteps } from './components/TodoCard';
import {
  CHAT,
  ChatComposer,
  ChatMessageList,
  ChatStyles,
  ChatWelcome,
} from '../chat';
import { AppShell, AppRail } from '../components/app-shell';
import { ArtifactPanel } from './artifact/ArtifactPanel';
import { useWorkflowArtifactSync } from './artifact/useWorkflowArtifactSync';
import { HeadlessCanvasBridge } from './HeadlessCanvasBridge';
import { CanvasHistoryPopover } from './components/CanvasHistoryPopover';
import { TrajectoryPanel } from './components/TrajectoryPanel';
import { ModelPicker } from './components/ModelPicker';
import { StatsPills } from '../chat/StatsPills';
import { NewTaskSetupPanel } from './components/NewTaskSetupPanel';

export const AiWorkspace: React.FC = () => {
  useLanguage();
  const navigate = useNavigate();
  const { sessionKey: routeSessionKey } = useParams<{ sessionKey?: string }>();

  /** 会话 URL 前缀（统一任务模式只有一套地址空间） */
  const sessionBase = '/chat';

  const {
    messages,
    streaming,
    sessions,
    currentSessionKey,
    switchSession,
    sendMessage,
    draftSetup,
    updateDraftSetup,
  } = useAgent();

  /** 新任务草稿（draft-）：欢迎页显示「任务设置」面板，首条消息时选项生效 */
  const isNewTaskDraft = currentSessionKey?.startsWith('draft-') || false;

  // 产物同步挂在「始终存在」的层上：面板收起时也继续跟进
  useWorkflowArtifactSync();
  const { doc, meta, snapshots, cursor } = useWorkflowDocumentState();
  const hasArtifact = !doc.isEmpty;

  const [inspectorOpen, setInspectorOpen] = useState<boolean>(hasArtifact);
  const userToggledRef = useRef(false);
  /** 对话区视图（dsh 式：对话 | Trajectory），切会话不重置 —— Trajectory 是查看视角不是会话状态 */
  const [chatView, setChatView] = useState<'chat' | 'trajectory'>('chat');

  useEffect(() => {
    if (hasArtifact && !userToggledRef.current) setInspectorOpen(true);
  }, [hasArtifact]);

  // ---------- 会话与 URL 双向对齐 ----------
  // URL → 状态：直接打开 /chat/xxx 时切到那一段。
  // URL 上的会话可能还没进 sessions 列表（新建任务弹窗创建后直跳）：
  // 路由是权威，无条件跟随——等列表刷新再切会把消息发回旧会话（实测踩坑）。
  useEffect(() => {
    if (!routeSessionKey) return;
    if (routeSessionKey === currentSessionKey) return;
    if (routeSessionKey.startsWith('draft-')) return;
    void switchSession(routeSessionKey);
  }, [routeSessionKey, currentSessionKey, sessions, switchSession]);

  // 停在 /chat 上时归一到当前会话，让「当前对话」永远有地址
  useEffect(() => {
    if (routeSessionKey || !currentSessionKey) return;
    if (currentSessionKey.startsWith('draft-')) return;
    navigate(`${sessionBase}/${currentSessionKey}`, { replace: true });
  }, [routeSessionKey, currentSessionKey, navigate]);

  // 草稿路由跟随物化：草稿会话 commit 后，地址栏从 draft-xxx 换成真实 key，
  // 避免浏览器从编辑器「后退」落在一个不存在的草稿地址上，会话恢复错位。
  useEffect(() => {
    if (!routeSessionKey?.startsWith('draft-')) return;
    if (!currentSessionKey || currentSessionKey.startsWith('draft-')) return;
    navigate(`${sessionBase}/${currentSessionKey}`, { replace: true });
  }, [routeSessionKey, currentSessionKey, navigate]);

  // 首页对话入口带过来的「首条消息」：等 URL 落到目标会话后消费一次并自动发送。
  // 依赖只挂 routeSessionKey，避免 sendMessage/messages 变化导致 effect 重跑把定时器清掉；
  // 用 peek（不消费）判断、真正触发时才 take（取走即清空），
  // 这样 StrictMode 的双调用与重排都不会吞掉这条消息，也不会重复发送。
  const sendMessageRef = useRef(sendMessage);
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  });
  useEffect(() => {
    if (!routeSessionKey) return;
    if (!peekInitialPrompt()) return;
    const timer = setTimeout(() => {
      const prompt = takeInitialPrompt(routeSessionKey);
      if (!prompt) return;
      void sendMessageRef.current(prompt.text, prompt.images);
    }, 260);
    return () => clearTimeout(timer);
  }, [routeSessionKey]);

  const currentSession = useMemo(
    () => sessions.find((s) => s.sessionKey === currentSessionKey),
    [sessions, currentSessionKey]
  );

  const suggestions = useMemo(
    () => [
      t('workspace.example1'),
      t('workspace.example2'),
      t('workspace.example3'),
      t('workspace.example4'),
    ],
    []
  );

  const showWelcome = messages.length === 0 && !streaming;
  // 上下文容量：run 落定（streaming→false）后 bump，触发容量条重取最新调用规模
  const [capacityTick, setCapacityTick] = useState(0);
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    if (wasStreamingRef.current && !streaming) setCapacityTick((v) => v + 1);
    wasStreamingRef.current = streaming;
  }, [streaming]);
  const closeInspector = () => {
    userToggledRef.current = true;
    setInspectorOpen(false);
  };
  // 顶栏右侧 PanelRight（⌘.）：展开时默认落到产物；已展开则整体收起
  const toggleInspectorFromShell = () => {
    setInspectorOpen((prev) => {
      if (prev) {
        userToggledRef.current = true;
        return false;
      }
      userToggledRef.current = false;
      return true;
    });
  };

  return (
    <>
      <ChatStyles />
      {/* AI 的画布类工具在 headless DSL 上执行，不依赖真实画布 */}
      <HeadlessCanvasBridge />

      <AppShell
        railMiddle={<AppRail />}
        title={
          <>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: CHAT.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
              title={currentSession?.title}
            >
              {currentSession?.title || t('workspace.brand')}
            </span>
            {currentSession?.engine === 'ark' && (
              <Tag
                size="small"
                shape="circle"
                style={{ flexShrink: 0, background: '#f9f0ff', border: '1px solid #d3adf7', color: '#531dab' }}
              >
                方舟托管
              </Tag>
            )}
          </>
        }
        actions={
          <>
            {snapshots.length > 0 && (
              <CanvasHistoryPopover workflowCode={meta.workflowCode}>
                <button
                  type="button"
                  title={t('chat.historyTitle')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    border: `1px solid ${CHAT.line}`,
                    background: 'var(--g-bg-raised)',
                    borderRadius: 8,
                    padding: '3px 9px',
                    fontSize: 12,
                    color: CHAT.textSub,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <IconHistory size="small" />
                  {t('chat.snapshotVersion', { n: cursor + 1 })}
                </button>
              </CanvasHistoryPopover>
            )}
          </>
        }
        inspector={
          inspectorOpen ? (
            <ArtifactPanel onCollapse={closeInspector} />
          ) : undefined
        }
        inspectorAvailable
        inspectorOpen={inspectorOpen}
        onToggleInspector={toggleInspectorFromShell}
      >
        {/* 消息区：dsh 式视图标签（对话 | Trajectory）——同一会话的两种投影，互斥切换 */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="ws-view-tabs" role="tablist">
            <style>{`
              .ws-view-tabs { display: flex; gap: 28px; padding: 4px 20px 0; border-bottom: 1px solid var(--g-line); }
              .ws-view-tab {
                position: relative; padding: 4px 2px 8px; border: none; background: none;
                font-size: 13px; font-weight: 500; font-family: inherit; cursor: pointer;
                color: var(--g-text-muted); transition: color .14s;
              }
              .ws-view-tab::after {
                content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px;
                border-radius: 2px; background: transparent;
              }
              .ws-view-tab:hover { color: var(--g-text-sub); }
              .ws-view-tab.on { color: var(--g-text); }
              .ws-view-tab.on::after { background: var(--g-text); }
            `}</style>
            <button
              type="button"
              role="tab"
              aria-selected={chatView === 'chat'}
              className={`ws-view-tab${chatView === 'chat' ? ' on' : ''}`}
              onClick={() => setChatView('chat')}
            >
              {t('trace.view.chat')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chatView === 'trajectory'}
              className={`ws-view-tab${chatView === 'trajectory' ? ' on' : ''}`}
              onClick={() => setChatView('trajectory')}
            >
              {t('trace.view.trajectory')}
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {chatView === 'trajectory' ? (
              <TrajectoryPanel sessionKey={currentSessionKey || undefined} streaming={streaming} />
            ) : showWelcome ? (
              <div className="chat-scroll" style={{ height: '100%', overflowY: 'auto' }}>
                <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', boxSizing: 'border-box' }}>
                  {isNewTaskDraft && draftSetup && (
                    <NewTaskSetupPanel setup={draftSetup} onChange={updateDraftSetup} />
                  )}
                  <ChatWelcome
                    title={t('workspace.greeting')}
                    description={t('workspace.greetingDesc')}
                    suggestions={suggestions}
                    onPick={(text) => void sendMessage(text)}
                    disabled={streaming || !currentSessionKey}
                  />
                </div>
              </div>
            ) : (
              <div style={{ height: '100%', overflowY: 'auto', position: 'relative' }}>
                {/* 任务清单：右上角悬浮，不占对话流空间，默认折叠只展示最新事件 */}
                <div style={{ position: 'absolute', top: 10, right: 16, zIndex: 20 }}>
                  <TodoCardInline messages={messages} />
                </div>
                <ChatMessageList hidePlanCards />
              </div>
            )}
          </div>
        </div>

        <ChatComposer
          disabled={!currentSessionKey}
          placeholder={t('workspace.inputPlaceholder')}
          hint={t('workspace.inputHint')}
          toolbarSlot={
            <>
              <StatsPills
                sessionKey={currentSessionKey || undefined}
                refreshTick={capacityTick}
              />
              <ModelPicker />
            </>
          }
        />
      </AppShell>
    </>
  );
};

export default AiWorkspace;

/** TodoCard 桥接：从 agent 消息流提取最新任务清单（2026-10-17 反馈1） */
const TodoCardInline: React.FC<{ messages: any[] }> = ({ messages }) => {
  const steps = extractLatestTodoSteps(messages);
  if (!steps || steps.length === 0) return null;
  return <TodoCard steps={steps} />;
};
