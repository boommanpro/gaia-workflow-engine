/**
 * AI 工作区 —— 以对话为核心主视角、工作流为最终产物。
 *
 * 同时承载两种模式（由路由前缀推导）：
 *   Chat  /chat,  /chat/:sessionKey              左栏=全部会话
 *   Work  /work,  /work/c/:sessionKey            左栏=文件夹分组的对话
 *
 * 外壳交给统一的 AppShell：【左栏：模式列表】｜【中区：对话】｜【右栏：产物 / 工具】。
 * URL 即状态：会话 key 永远落在地址栏，可收藏、可分享、可前进后退。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { takeInitialPrompt, peekInitialPrompt } from '../agent/initialPrompt';
import { Button, Tag } from '@douyinfe/semi-ui';
import { IconHistory, IconPlus } from '@douyinfe/semi-icons';

import { useAgent } from '../agent/AgentContext';
import { AgentConfirmLayer } from '../agent/ConfirmModal';
import { SessionList } from '../agent/SessionList';
import { useLanguage, t } from '../i18n';
import { useWorkflowDocumentState } from '../document';
import {
  CHAT,
  ChatComposer,
  ChatMessageList,
  ChatStyles,
  ChatWelcome,
} from '../chat';
import { AppShell, WorkRail, type SectionMode } from '../components/app-shell';
import { ArtifactPanel } from './artifact/ArtifactPanel';
import { useWorkflowArtifactSync } from './artifact/useWorkflowArtifactSync';
import { HeadlessCanvasBridge } from './HeadlessCanvasBridge';
import { WorkspaceToolExecutor } from './WorkspaceToolExecutor';
import { CanvasHistoryPopover } from './components/CanvasHistoryPopover';
import { WorkToolsPanel } from './components/WorkToolsPanel';

/** 右栏 Inspector 当前展示的视图（Agent 设置只在管理端配置中心，不在此处重复） */
type InspectorView = 'artifact' | 'tools';

export const AiWorkspace: React.FC = () => {
  useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionKey: routeSessionKey } = useParams<{ sessionKey?: string }>();

  const mode: SectionMode = location.pathname.startsWith('/work') ? 'work' : 'chat';
  /** 会话 URL 前缀：Chat 与 Work 各自一套地址空间 */
  const sessionBase = mode === 'work' ? '/work/c' : '/chat';
  /** 模式根路径（未选中任何会话时的地址） */
  const modeRoot = mode === 'work' ? '/work' : '/chat';

  const {
    messages,
    streaming,
    sessions,
    currentSessionKey,
    switchSession,
    createSession,
    sendMessage,
  } = useAgent();

  // 产物同步挂在「始终存在」的层上：面板收起时也继续跟进
  useWorkflowArtifactSync();
  const { doc, meta, snapshots, cursor } = useWorkflowDocumentState();
  const hasArtifact = !doc.isEmpty;

  const [inspectorView, setInspectorView] = useState<InspectorView | null>(hasArtifact ? 'artifact' : null);
  const userToggledRef = useRef(false);
  /** 刚点了「新对话」：等新会话 key 落地后把 URL 跟上去 */
  const pendingNewRef = useRef(false);

  // 切换模式（Chat ↔ Work）时重算右栏默认视图，避免上一模式的状态串味
  useEffect(() => {
    setInspectorView(hasArtifact ? 'artifact' : null);
    userToggledRef.current = false;
  }, [mode]);

  useEffect(() => {
    if (hasArtifact && !userToggledRef.current) setInspectorView('artifact');
  }, [hasArtifact]);

  // ---------- 会话与 URL 双向对齐 ----------
  // URL → 状态：直接打开 /chat/xxx 或 /work/c/xxx 时切到那一段。
  // URL 上的会话可能还没进 sessions 列表（工作流库「发起会话」创建后直跳）：
  // 路由是权威，无条件跟随——等列表刷新再切会把消息发回旧会话（实测踩坑）。
  useEffect(() => {
    if (!routeSessionKey) return;
    if (routeSessionKey === currentSessionKey) return;
    if (pendingNewRef.current) return;
    if (routeSessionKey.startsWith('draft-')) return;
    void switchSession(routeSessionKey);
  }, [routeSessionKey, currentSessionKey, sessions, switchSession]);

  // 状态 → URL：新建会话后把地址栏跟上去，避免地址栏停留在上一段
  useEffect(() => {
    if (!pendingNewRef.current || !currentSessionKey) return;
    if (currentSessionKey.startsWith('draft-')) return; // 草稿会话不落 URL，commit 后再跟随
    pendingNewRef.current = false;
    navigate(`${sessionBase}/${currentSessionKey}`, { replace: true });
  }, [currentSessionKey, navigate, sessionBase]);

  // 停在 /chat 或 /work 上时归一到当前会话，让「当前对话」永远有地址
  useEffect(() => {
    if (routeSessionKey || !currentSessionKey) return;
    if (currentSessionKey.startsWith('draft-')) return;
    navigate(`${sessionBase}/${currentSessionKey}`, { replace: true });
  }, [routeSessionKey, currentSessionKey, navigate, sessionBase]);

  // 草稿路由跟随物化：首页发起的会话 commit 后，地址栏从 draft-xxx 换成真实 key。
  // 不跟的话浏览器从编辑器「后退」会落在一个不存在的草稿地址上，会话恢复必然错位。
  useEffect(() => {
    if (!routeSessionKey?.startsWith('draft-')) return;
    if (!currentSessionKey || currentSessionKey.startsWith('draft-')) return;
    navigate(`${sessionBase}/${currentSessionKey}`, { replace: true });
  }, [routeSessionKey, currentSessionKey, navigate, sessionBase]);

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

  const handleNewSession = useCallback(() => {
    pendingNewRef.current = true;
    // 新建对话先归位地址栏，避免停留在上一段会话的 URL 上
    navigate(modeRoot, { replace: true });
    void createSession(undefined, { scope: mode, folderId: null });
  }, [createSession, mode, navigate, modeRoot]);

  /** Work 模式：在指定文件夹内新建对话（草稿先建立，首条消息成功后才落库归档） */
  const handleCreateInFolder = useCallback((folderId: number) => {
    pendingNewRef.current = true;
    navigate(modeRoot, { replace: true });
    void createSession(undefined, { scope: 'work', folderId });
  }, [createSession, navigate, modeRoot]);

  /**
   * 点击左栏历史会话。
   * 关键：清掉 pendingNewRef —— 否则「新建对话」留下未提交的草稿后，
   * 该标记会让“URL → 状态”的 effect 一直 return，点历史会话就不切了。
   */
  const handleSelectSession = useCallback((key: string) => {
    pendingNewRef.current = false;
    navigate(`${sessionBase}/${key}`);
  }, [navigate, sessionBase]);

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
  const closeInspector = () => {
    userToggledRef.current = true;
    setInspectorView(null);
  };
  const toggleInspector = (view: InspectorView) => {
    setInspectorView((prev) => {
      const next = prev === view ? null : view;
      // 视图切到产物外的任意状态都视为用户手动操作，避免被自动展开逻辑抢回
      userToggledRef.current = next !== 'artifact';
      return next;
    });
  };
  // 顶栏右侧 PanelRight（⌘.）：展开时默认落到产物；已展开则整体收起
  const toggleInspectorFromShell = () => {
    setInspectorView((prev) => {
      if (prev) {
        userToggledRef.current = true;
        return null;
      }
      userToggledRef.current = false;
      return 'artifact';
    });
  };

  const brandSubtitle = mode === 'work' ? t('shell.modeWork') : t('shell.modeChat');

  return (
    <>
      <ChatStyles />
      {/* AI 的画布类工具在 headless DSL 上执行，不依赖真实画布 */}
      <HeadlessCanvasBridge />
      {/* 工作区不渲染 AgentDock，需要自己挂载工具执行器与确认弹窗 */}
      <WorkspaceToolExecutor />
      <AgentConfirmLayer position="fixed" />

      <AppShell
        mode={mode}
        railTop={
          mode === 'work' ? undefined : (
            <Button
              block
              theme="solid"
              type="primary"
              icon={<IconPlus />}
              onClick={handleNewSession}
              style={{ borderRadius: 10, background: CHAT.accent, borderColor: CHAT.accent }}
            >
              {t('workspace.newConversation')}
            </Button>
          )
        }
        railMiddle={
          mode === 'work' ? (
            <WorkRail
              onSelect={handleSelectSession}
              onCreateInFolder={handleCreateInFolder}
            />
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <SessionList
                hideChrome
                onSelect={handleSelectSession}
                filter={(s) => (s.scope || 'chat') === 'chat'}
              />
            </div>
          )
        }
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
            <Tag
              size="small"
              color="white"
              shape="circle"
              style={{ flexShrink: 0, border: `1px solid ${CHAT.line}`, color: CHAT.textMuted }}
            >
              {brandSubtitle}
            </Tag>
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
            {mode === 'work' && (
              <button
                type="button"
                onClick={() => toggleInspector('tools')}
                title={t('shell.tools')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  border: `1px solid ${inspectorView === 'tools' ? CHAT.accentBorder : CHAT.line}`,
                  background: inspectorView === 'tools' ? CHAT.accentSoft : 'var(--g-bg-raised)',
                  borderRadius: 8,
                  padding: '3px 9px',
                  fontSize: 12,
                  color: inspectorView === 'tools' ? CHAT.accent : CHAT.textSub,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {t('shell.tools')}
              </button>
            )}
          </>
        }
        inspector={
          inspectorView === 'artifact' ? (
            <ArtifactPanel onCollapse={closeInspector} />
          ) : inspectorView === 'tools' ? (
            <WorkToolsPanel onClose={closeInspector} />
          ) : undefined
        }
        inspectorAvailable
        inspectorOpen={inspectorView !== null}
        onToggleInspector={toggleInspectorFromShell}
      >
        {/* 消息区 */}
        <div style={{ flex: 1, minHeight: 0 }}>
          {showWelcome ? (
            <div className="chat-scroll" style={{ height: '100%', overflowY: 'auto' }}>
              <ChatWelcome
                title={t('workspace.greeting')}
                description={t('workspace.greetingDesc')}
                suggestions={suggestions}
                onPick={(text) => void sendMessage(text)}
                disabled={streaming || !currentSessionKey}
              />
            </div>
          ) : (
            <ChatMessageList
              onSnapshotView={() => {
                userToggledRef.current = false;
                setInspectorView('artifact');
              }}
            />
          )}
        </div>

        <ChatComposer
          disabled={!currentSessionKey}
          placeholder={t('workspace.inputPlaceholder')}
          hint={t('workspace.inputHint')}
        />
      </AppShell>
    </>
  );
};

export default AiWorkspace;
