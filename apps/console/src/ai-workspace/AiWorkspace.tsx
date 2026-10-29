/**
 * AI 工作区 —— 对话优先 IA 的主页：以对话为核心主视角、工作流为最终产物。
 *
 * 任务即会话（Chat/Work 双 scope 已合并），项目分组的入口在左栏 AppRail：
 * 【左栏：新建任务 / 工作流管理 / 项目列表】｜【中区：对话】｜【右栏：产物】。
 * URL 即状态：会话 key 永远落在地址栏，可收藏、可分享、可前进后退。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { takeInitialPrompt, peekInitialPrompt } from '../agent/initialPrompt';
import { Tag, Spin } from '@douyinfe/semi-ui';
import { IconHistory } from '@douyinfe/semi-icons';

import { useAgent, useRunStreaming } from '../agent/AgentContext';
import { useRuntime } from '../agent/runtime/store';
import { useLanguage, t } from '../i18n';
import { useWorkflowDocumentState } from '../document';
import { TodoCard, extractLatestTodoSteps } from './components/TodoCard';
import {
  CHAT,
  ChatComposer,
  ChatMessageList,
  ChatStyles,
  WelcomeGreeting,
} from '../chat';
import { AppShell, AppRail } from '../components/app-shell';
import { ArtifactPanel } from './artifact/ArtifactPanel';
import { useWorkflowArtifactSync } from './artifact/useWorkflowArtifactSync';
import { HeadlessCanvasBridge } from './HeadlessCanvasBridge';
import { CanvasHistoryPopover } from './components/CanvasHistoryPopover';
import { TrajectoryPanel } from './components/TrajectoryPanel';
import { ModelPicker } from './components/ModelPicker';
import { StatsPills } from '../chat/StatsPills';
import { NewTaskChips } from './components/NewTaskChips';

export const AiWorkspace: React.FC = () => {
  useLanguage();
  const navigate = useNavigate();
  const { sessionKey: routeSessionKey } = useParams<{ sessionKey?: string }>();
  // 查询串随路由归一保留：?replay=（回放模式）等参数不能在 /chat → /chat/<key> 时被丢掉，
  // 否则刷新页面后回放失效、退回真实后端（e2e 刷新一致性场景的前提）
  const search = useLocation().search;

  /** 会话 URL 前缀（统一任务模式只有一套地址空间） */
  const sessionBase = '/chat';

  const {
    sessions,
    currentSessionKey,
    switchSession,
    sendMessage,
    draftSetup,
    updateDraftSetup,
  } = useAgent();
  const messages = useRuntime((s) => s.messages);
  const historyLoading = useRuntime((s) => s.historyLoading);
  const streaming = useRunStreaming();

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

  // 产物面板默认开合跟随产物有无：AI 产出首个产物自动展开，
  // 新建任务/切到无产物的会话自动收起；用户手动开过后（toggled）交给用户
  useEffect(() => {
    if (userToggledRef.current) return;
    setInspectorOpen(hasArtifact);
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
    navigate(`${sessionBase}/${currentSessionKey}${search}`, { replace: true });
  }, [routeSessionKey, currentSessionKey, navigate, search]);

  // 草稿路由跟随物化：草稿会话 commit 后，地址栏从 draft-xxx 换成真实 key，
  // 避免浏览器从编辑器「后退」落在一个不存在的草稿地址上，会话恢复错位。
  useEffect(() => {
    if (!routeSessionKey?.startsWith('draft-')) return;
    if (!currentSessionKey || currentSessionKey.startsWith('draft-')) return;
    navigate(`${sessionBase}/${currentSessionKey}${search}`, { replace: true });
  }, [routeSessionKey, currentSessionKey, navigate, search]);

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

  // 欢迎态只在「确认没有历史」时出现：切换会话的加载期（historyLoading）显示加载占位，
  // 不渲染欢迎页——否则每次切换都会闪一遍 hero 输入卡再换成消息列表（闪烁感的来源）
  const showWelcome = messages.length === 0 && !streaming && !historyLoading;
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
              {currentSession?.title
                || (isNewTaskDraft ? t('shell.newTask') : t('workspace.brand'))}
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
        {/* 消息区：dsh 式视图标签（对话 | Trajectory）——同一会话的两种投影，互斥切换。
            空会话（新建任务欢迎态）没有任何投影可切，不显示标签 */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {!showWelcome && (
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
          )}
          <div style={{ flex: 1, minHeight: 0 }}>
            {!showWelcome && chatView === 'trajectory' ? (
              <TrajectoryPanel sessionKey={currentSessionKey || undefined} streaming={streaming} />
            ) : historyLoading && messages.length === 0 ? (
              /* 会话切换加载期：中间内容空白 + 轻量加载指示，布局（标签/底部输入）保持不动 */
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin size="middle" />
              </div>
            ) : showWelcome ? (
              /* 欢迎态：输入卡是主角，问候在其上；任务选项收敛进卡顶 chips（draft 会话才有） */
              <div className="chat-scroll" style={{ height: '100%', overflowY: 'auto' }}>
                <div
                  style={{
                    minHeight: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px 20px 48px',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* 大屏自适应：hero 卡随视口伸缩，1080p/2K 上撑满到 1200px，小屏回落 820 */}
                  <div style={{ width: '100%', maxWidth: 'clamp(820px, 62vw, 1200px)' }}>
                    <WelcomeGreeting />
                    <ChatComposer
                      variant="hero"
                      maxWidth="clamp(820px, 62vw, 1200px)"
                      disabled={!currentSessionKey}
                      placeholder={t('workspace.inputPlaceholder')}
                      hint={t('workspace.inputHint')}
                      headerSlot={
                        isNewTaskDraft && draftSetup ? (
                          <div style={{ padding: '14px 16px 0' }}>
                            <NewTaskChips setup={draftSetup} onChange={updateDraftSetup} />
                          </div>
                        ) : undefined
                      }
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
                  </div>
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

        {/* 底部常驻输入：欢迎态已由居中 hero 输入卡承担，不重复渲染 */}
        {!showWelcome && (
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
        )}
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
