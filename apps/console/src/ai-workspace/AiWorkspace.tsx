/**
 * AI 工作区 —— 以对话为核心主视角、工作流为最终产物（「通用模式」）。
 *
 * 布局：【会话】｜【对话（居中窄栏）】｜【产物】
 * 交互基调对齐成熟的对话式产品：欢迎态给可直接点的例子，对话居中成一条窄栏，
 * 输入卡片吸附在底部，过程性信息（工具调用）默认折叠，用户只看结论。
 *
 * URL 即状态：/            → 工作区（会自动归一化到当前会话）
 *              /c/:sessionKey → 某一段具体对话（可收藏、可分享、可前进后退）
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { takeInitialPrompt, peekInitialPrompt } from '../agent/initialPrompt';
import { Tag } from '@douyinfe/semi-ui';
import { IconArrowLeft, IconHistory } from '@douyinfe/semi-icons';

import { useAgent } from '../agent/AgentContext';
import { AgentConfirmLayer } from '../agent/ConfirmModal';
import { useLanguage, t } from '../i18n';
import { useWorkflowDocumentState } from '../document';
import {
  CHAT,
  ChatComposer,
  ChatMessageList,
  ChatStyles,
  ChatWelcome,
} from '../chat';
import { ArtifactPanel } from './artifact/ArtifactPanel';
import { useWorkflowArtifactSync } from './artifact/useWorkflowArtifactSync';
import { HeadlessCanvasBridge } from './HeadlessCanvasBridge';
import { WorkspaceToolExecutor } from './WorkspaceToolExecutor';
import { SessionRail } from './components/SessionRail';
import { CanvasHistoryPopover } from './components/CanvasHistoryPopover';

const ARTIFACT_WIDTH = 420;

export const AiWorkspace: React.FC = () => {
  useLanguage();
  const navigate = useNavigate();
  const { sessionKey: routeSessionKey } = useParams<{ sessionKey?: string }>();

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

  const [artifactOpen, setArtifactOpen] = useState(hasArtifact);
  const userToggledRef = useRef(false);
  /** 刚点了「新对话」：等新会话 key 落地后把 URL 跟上去 */
  const pendingNewRef = useRef(false);

  useEffect(() => {
    if (hasArtifact && !userToggledRef.current) setArtifactOpen(true);
  }, [hasArtifact]);

  // ---------- 会话与 URL 双向对齐 ----------
  // URL → 状态：直接打开 /c/xxx 时切到那一段
  useEffect(() => {
    if (!routeSessionKey) return;
    if (routeSessionKey === currentSessionKey) return;
    if (pendingNewRef.current) return;
    if (!sessions.some((s) => s.sessionKey === routeSessionKey)) return;
    void switchSession(routeSessionKey);
  }, [routeSessionKey, currentSessionKey, sessions, switchSession]);

  // 状态 → URL：新建会话后把地址栏跟上去，避免地址栏停留在上一段
  useEffect(() => {
    if (!pendingNewRef.current || !currentSessionKey) return;
    pendingNewRef.current = false;
    navigate(`/c/${currentSessionKey}`, { replace: true });
  }, [currentSessionKey, navigate]);

  // 停在 / 上时归一到当前会话，让「当前对话」永远有地址
  useEffect(() => {
    if (routeSessionKey || !currentSessionKey) return;
    navigate(`/c/${currentSessionKey}`, { replace: true });
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

  const handleNewSession = useCallback(() => {
    pendingNewRef.current = true;
    void createSession();
  }, [createSession]);

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
  const collapseArtifact = () => {
    userToggledRef.current = true;
    setArtifactOpen(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        background: CHAT.bgApp,
        position: 'relative',
      }}
    >
      <ChatStyles />
      {/* AI 的画布类工具在 headless DSL 上执行，不依赖真实画布 */}
      <HeadlessCanvasBridge />
      {/* 工作区不渲染 AgentDock，需要自己挂载工具执行器与确认弹窗 */}
      <WorkspaceToolExecutor />
      <AgentConfirmLayer position="fixed" />

      <SessionRail onSelectSession={(key) => navigate(`/c/${key}`)} onNewSession={handleNewSession} />

      {/* 对话：主位 */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: CHAT.bg }}>
        {/* 顶部条：当前会话 + 次要动作 */}
        <header
          style={{
            height: 52,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 16px 0 18px',
            borderBottom: `1px solid ${CHAT.lineSoft}`,
          }}
        >
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
          <Tag size="small" color="white" shape="circle" style={{ flexShrink: 0, border: `1px solid ${CHAT.line}`, color: CHAT.textMuted }}>
            {t('workspace.modeGeneral')}
          </Tag>

          {/* 右侧只留一个「画布历史」—— 打开工作流、新建对话、落版都不在这里重复出现。
              历史入口放在这条常驻头部上，是为了让产物面板收起时也够得着。 */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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
                    background: '#fff',
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
          </div>
        </header>

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
                setArtifactOpen(true);
              }}
            />
          )}
        </div>

        <ChatComposer
          disabled={!currentSessionKey}
          placeholder={t('workspace.inputPlaceholder')}
          hint={t('workspace.inputHint')}
        />
      </div>

      {/* 产物区 */}
      {artifactOpen ? (
        <div style={{ width: ARTIFACT_WIDTH, flexShrink: 0, display: 'flex' }}>
          <ArtifactPanel onCollapse={collapseArtifact} />
        </div>
      ) : (
        <button
          onClick={() => {
            userToggledRef.current = false;
            setArtifactOpen(true);
          }}
          title={hasArtifact ? t('workspace.expandArtifact') : t('workspace.artifactEmpty')}
          style={{
            width: 38,
            flexShrink: 0,
            border: 'none',
            borderLeft: `1px solid ${CHAT.line}`,
            background: hasArtifact ? '#fff' : '#fafafc',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: hasArtifact ? CHAT.accent : CHAT.textFaint,
          }}
        >
          <IconArrowLeft />
          <span
            style={{
              writingMode: 'vertical-rl',
              fontSize: 11,
              letterSpacing: 1,
              color: hasArtifact ? CHAT.textSub : CHAT.textFaint,
            }}
          >
            {t('workspace.artifact')}
          </span>
          {hasArtifact && (
            <span
              style={{ width: 6, height: 6, borderRadius: '50%', background: CHAT.accent, flexShrink: 0 }}
            />
          )}
        </button>
      )}
    </div>
  );
};

export default AiWorkspace;
