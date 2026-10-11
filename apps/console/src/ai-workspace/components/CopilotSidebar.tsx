/**
 * CopilotSidebar —— 专家模式的对话侧边栏。
 *
 * 形态差异就是产品语义差异：
 *   通用模式（/）       对话是主位，工作流是「聊出来的产物」
 *   专家模式（/editor） 画布是主位，对话退到右侧，变成「手边的协作者」
 *
 * 这一版重点解决「点了画布之后体验很差」：
 *   1. 头部从 8 个入口压到 3 个（收起 / 会话选择器 / 版本），语义不再重叠。
 *   2. 会话切换走浮层，不再整屏盖住正文 —— 换会话不该让人失去上下文。
 *   3. 画布上选中节点 → 输入区上方出现引用条，提问自动带上「说的是哪个节点」。
 *   4. AI 刚改完画布 → 顶部浮动一条「本轮改动 · 撤销」，用户对画布始终有掌控权。
 *
 * 两处共用同一个 AgentContext 会话与同一份 workflowDocumentStore，所以从主页面
 * 切进来时对话历史和刚生成的工作流都还在，不是新开一局。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Popover, Tooltip } from '@douyinfe/semi-ui';
import {
  IconPlus,
  IconMinus,
  IconSend,
  IconClose,
} from '@douyinfe/semi-icons';

import { useAgent } from '../../agent/AgentContext';
import { agentApi } from '../../agent/api';
import SessionList from '../../agent/SessionList';
import { useLanguage, t } from '../../i18n';
import { publicPath } from '../../utils/public-path';
import { useWorkflowDocumentState, useCanvasSelection, workflowDocumentStore } from '../../document';
import { CHAT, ChatComposer, ChatMessageList, ChatStyles } from '../../chat';
import {
  bindSessionToWorkflow,
  findSessionForWorkflow,
  getWorkflowOfSession,
} from '../session-scope';

/** 悬浮窗尺寸：右下角小型浮窗，不占编辑器布局 */
const FLOAT_WIDTH = 384;
const FLOAT_HEIGHT = 560;
const FLOAT_Z_INDEX = 9700;
const OPEN_STATE_KEY = 'gaia.copilot.open';

interface CopilotSidebarProps {
  /** 当前工作流名（展示在头部，强调「你在哪个上下文里对话」） */
  workflowName?: string;
  /** 当前工作流编码（决定这段对话的归属） */
  workflowCode?: string;
}

export const CopilotSidebar: React.FC<CopilotSidebarProps> = ({ workflowName, workflowCode }) => {
  useLanguage();
  const {
    sessions,
    currentSessionKey,
    createSession,
    switchSession,
    streaming,
    queueLength,
  } = useAgent();
  const { snapshots, cursor } = useWorkflowDocumentState();
  const selection = useCanvasSelection();

  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(OPEN_STATE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggleOpen = useCallback((next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(OPEN_STATE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);
  /** 悬浮窗宽度可拖拽调节（320-560px） */
  const [floatWidth, setFloatWidth] = useState(FLOAT_WIDTH);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bindingTick, setBindingTick] = useState(0);
  /** 引用条被手动关掉的那个节点，换节点后会重新出现 */
  const [refDismissed, setRefDismissed] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  /** 本轮改动条挂在哪个快照上 */
  const [changeBarFor, setChangeBarFor] = useState<string | null>(null);
  const lastSnapIdRef = useRef<string | null>(null);
  /** 刚为这个工作流新建的会话，等 currentSessionKey 生效后认领它 */
  const pendingBindRef = useRef<string | null>(null);
  /** 用户主动换过会话时，不再用「已有归属会话」把他拽回去 */
  const userPickedRef = useRef(false);

  const currentSession = sessions.find((s) => s.sessionKey === currentSessionKey);
  const ownerSessionKey = findSessionForWorkflow(sessions, workflowCode || null);

  /** 当前会话是否就是「这个工作流的那段对话」 */
  const scoped = useMemo(
    () => !workflowCode || getWorkflowOfSession(currentSessionKey) === workflowCode,
    // bindingTick 用于绑定后强制重算（localStorage 不是响应式数据源）
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflowCode, currentSessionKey, bindingTick]
  );

  useEffect(() => {
    if (!workflowCode) return;

    if (pendingBindRef.current === workflowCode && currentSessionKey) {
      pendingBindRef.current = null;
      bindSessionToWorkflow(currentSessionKey, workflowCode);
      setBindingTick((v) => v + 1);
      return;
    }

    if (getWorkflowOfSession(currentSessionKey) === workflowCode) return;

    if (!userPickedRef.current && ownerSessionKey && ownerSessionKey !== currentSessionKey) {
      void switchSession(ownerSessionKey);
    }
  }, [workflowCode, currentSessionKey, ownerSessionKey, switchSession]);

  const startScopedSession = useCallback(() => {
    if (!workflowCode) return;
    pendingBindRef.current = workflowCode;
    void createSession();
  }, [workflowCode, createSession]);

  // 专家模式新会话物化后，把工作流当前落版种子进会话草稿。
  // 不 seed 的话 AI 看到的是空画布，只能凭 workflowDetail 记忆盲重写整份 DSL
  // （实测在 65s 内连落 9 个版本只为恢复原状）。仅对无消息的全新会话执行，
  // 且每个会话只 seed 一次——旧会话可能已有 AI 修改过的草稿，覆盖会丢工作。
  const location = useLocation();
  const seededSessionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !workflowCode) return;
    if (!currentSessionKey || currentSessionKey.startsWith('draft-')) return;
    if (!/^\/(editor|template-editor)/.test(location.pathname)) return;
    if (seededSessionRef.current === currentSessionKey) return;
    seededSessionRef.current = currentSessionKey;
    void (async () => {
      try {
        const msgs = await agentApi.getMessages(currentSessionKey);
        if (msgs && msgs.length > 0) return;
        await agentApi.seedDraft(currentSessionKey, workflowCode);
      } catch { /* seed 失败不阻塞对话 */ }
    })();
  }, [open, workflowCode, currentSessionKey, bindingTick, location.pathname]);

  // 打开悬浮窗时，若这个工作流还没有归属的对话，自动创建并绑定一段对话 ——
  // 用户打开窗口直接输入发送即可，不再需要先点「为这个工作流开启一段对话」。
  // 只在用户主动打开窗口时触发：进编辑器不点开 AI 助手就不会产生空会话。
  useEffect(() => {
    if (!open || !workflowCode || scoped) return;
    if (pendingBindRef.current) return; // 创建/绑定流程已在进行
    if (userPickedRef.current) return; // 用户刚手动选了别的会话，不强行新建
    startScopedSession();
  }, [open, workflowCode, scoped, startScopedSession]);

  const handlePickSession = useCallback(
    (sessionKey: string) => {
      userPickedRef.current = true;
      if (workflowCode) {
        bindSessionToWorkflow(sessionKey, workflowCode);
        setBindingTick((v) => v + 1);
      }
      void switchSession(sessionKey);
      setPickerOpen(false);
    },
    [workflowCode, switchSession]
  );

  // ---------- 本轮改动条：AI 刚动过画布时浮出来，给一个立刻能按的撤销 ----------
  useEffect(() => {
    const current = snapshots[cursor];
    if (!current) return;
    const previousId = lastSnapIdRef.current;
    lastSnapIdRef.current = current.id;
    if (previousId === current.id) return;

    if (current.source === 'ai' && current.outcome === 'ok' && cursor > 0) {
      setChangeBarFor(current.id);
    } else if (current.source !== 'ai') {
      // 用户自己动的手，不需要再提醒他「你刚改过」
      setChangeBarFor(null);
    }
  }, [snapshots, cursor]);

  const currentSnapshot = snapshots[cursor];
  const previousSnapshot = cursor > 0 ? snapshots[cursor - 1] : undefined;
  const showChangeBar =
    !!changeBarFor && !!currentSnapshot && changeBarFor === currentSnapshot.id && !!previousSnapshot;

  const handleUndoChange = useCallback(() => {
    if (!previousSnapshot) return;
    workflowDocumentStore.rollbackTo(previousSnapshot.id);
    setChangeBarFor(null);
  }, [previousSnapshot]);

  // ---------- 画布引用：选中节点 → 提问自带上下文 ----------
  const activeRef = selection && selection.nodeId !== refDismissed ? selection : null;

  useEffect(() => {
    // 换了个节点就重新亮出来，用户上次关掉的是「上一个节点」
    setRefDismissed((prev) => (prev && prev !== selection?.nodeId ? null : prev));
  }, [selection?.nodeId]);

  const prefixBuilder = useCallback(
    () => (activeRef ? `【引用节点：${activeRef.nodeTitle}】\n` : ''),
    [activeRef]
  );

  const quickAction = useCallback((kind: 'explain' | 'optimize' | 'rename') => {
    const title = activeRef?.nodeTitle || '';
    if (kind === 'explain') setDraft(`解释一下节点「${title}」的作用，以及它的配置为什么这么填。`);
    else if (kind === 'optimize') setDraft(`帮我优化节点「${title}」的配置：`);
    else setDraft(`把节点「${title}」改名为 `);
  }, [activeRef]);

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = floatWidth;
      const onMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX;
        const next = Math.max(320, Math.min(560, startWidth + delta));
        setFloatWidth(next);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [floatWidth]
  );

  // ---------- 收起态：右下角 Gaia logo 小圆钮 ----------
  if (!open) {
    return (
      <button
        onClick={() => toggleOpen(true)}
        title={t('workspace.expandCopilot')}
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--g-bg-raised, #fff)',
          border: `1px solid ${CHAT.line}`,
          boxShadow: '0 8px 24px rgba(20,20,40,0.18)',
          cursor: 'pointer',
          zIndex: FLOAT_Z_INDEX,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <img
          src={publicPath('logo.svg')}
          alt="AI 助手"
          style={{ width: 34, height: 34, objectFit: 'contain', display: 'block' }}
        />
        {streaming && (
          <span
            style={{
              position: 'absolute',
              top: 3,
              right: 3,
              width: 11,
              height: 11,
              borderRadius: '50%',
              background: '#e5404e',
              border: '2px solid #fff',
            }}
          />
        )}
      </button>
    );
  }

  const versionNo = cursor + 1;
  const sessionLabel = scoped && currentSession ? currentSession.title : t('workspace.noSession');

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        width: floatWidth,
        height: FLOAT_HEIGHT,
        maxHeight: '76vh',
        zIndex: FLOAT_Z_INDEX,
        borderRadius: 14,
        border: `1px solid ${CHAT.line}`,
        background: CHAT.bg,
        boxShadow: '0 16px 48px rgba(20,20,40,0.20)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ChatStyles />

      {/* 拖拽条：贴着浮窗左缘调宽 */}
      <div
        onMouseDown={onResizeStart}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          cursor: 'col-resize',
          background: 'transparent',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      />

      {/* ---------- 单行头部 ---------- */}
      <div
        style={{
          height: 46,
          padding: '0 8px 0 10px',
          borderBottom: `1px solid ${CHAT.lineSoft}`,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Tooltip content={t('workspace.collapseCopilot')} position="bottomLeft">
          <Button
            size="small"
            theme="borderless"
            type="tertiary"
            icon={<IconMinus size="small" />}
            onClick={() => toggleOpen(false)}
            aria-label={t('workspace.collapseCopilot')}
          />
        </Tooltip>

          {/* 会话选择器：一个入口，包含切换与新建 */}
          <Popover
            trigger="click"
            position="bottomLeft"
            visible={pickerOpen}
            onVisibleChange={setPickerOpen}
            content={
              <div style={{ width: 268, display: 'flex', flexDirection: 'column', maxHeight: 380 }}>
                <div style={{ padding: '0 0 8px' }}>
                  <Button
                    block
                    theme="light"
                    type="primary"
                    icon={<IconPlus />}
                    onClick={() => {
                      setPickerOpen(false);
                      startScopedSession();
                    }}
                    style={{ borderRadius: 9 }}
                  >
                    {t('workspace.newConversation')}
                  </Button>
                </div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <SessionList hideChrome onSelect={handlePickSession} onClose={() => setPickerOpen(false)} />
                </div>
              </div>
            }
          >
            <button
              type="button"
              title={t('workspace.switchSession')}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: 'none',
                background: 'transparent',
                padding: '4px 6px',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = CHAT.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: CHAT.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '46%',
                }}
                title={workflowName || t('editor.newWorkflow')}
              >
                {workflowName || t('editor.newWorkflow')}
              </span>
              <span style={{ color: CHAT.textFaint, fontSize: 11, flexShrink: 0 }}>·</span>
              <span
                style={{
                  fontSize: 12,
                  color: scoped ? CHAT.textSub : CHAT.textMuted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {sessionLabel}
              </span>
              <span style={{ color: CHAT.textMuted, fontSize: 10, flexShrink: 0 }}>▾</span>
            </button>
          </Popover>

          {/* 版本只是「我现在站在第几版」的提示；切版本 / 回滚的唯一入口在编辑器头部，
              同一页不放两个版本控件。 */}
          {snapshots.length > 0 ? (
            <Tooltip content={t('workspace.versionHint')} position="bottomRight">
              <span
                style={{
                  border: `1px solid ${CHAT.line}`,
                  background: CHAT.bgSunken,
                  borderRadius: 7,
                  padding: '2px 8px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: CHAT.textSub,
                  flexShrink: 0,
                }}
              >
                {t('chat.snapshotVersion', { n: versionNo })}
              </span>
            </Tooltip>
          ) : (
            streaming && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: CHAT.accent,
                  flexShrink: 0,
                  marginRight: 4,
                }}
              />
            )
          )}
        </div>

        {/* ---------- 本轮改动条 ---------- */}
        {showChangeBar && currentSnapshot && (
          <div
            className="chat-fade"
            style={{
              padding: '7px 10px',
              borderBottom: `1px solid ${CHAT.lineSoft}`,
              background: CHAT.accentSoft,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 11.5, color: CHAT.accent, flex: 1, lineHeight: 1.5 }}>
              {t('workspace.changeBar', { n: versionNo })}
            </span>
            <button
              type="button"
              onClick={handleUndoChange}
              style={{
                border: 'none',
                background: 'transparent',
                color: CHAT.accent,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: 0,
                flexShrink: 0,
              }}
            >
              {t('workspace.undoChange')}
            </button>
            <button
              type="button"
              onClick={() => setChangeBarFor(null)}
              aria-label={t('Cancel')}
              style={{
                border: 'none',
                background: 'transparent',
                color: CHAT.textMuted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 0,
                flexShrink: 0,
              }}
            >
              <IconClose size="extra-small" />
            </button>
          </div>
        )}

        {/* ---------- 消息区 ---------- */}
        <div style={{ flex: 1, minHeight: 0 }}>
          {scoped && currentSessionKey ? (
            <ChatMessageList compact dense />
          ) : (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: CHAT.accentSoft,
                  color: CHAT.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 1.8l1.9 5.9 5.9 1.9-5.9 1.9L12 17.4l-1.9-5.9L4.2 9.6l5.9-1.9L12 1.8z" />
                </svg>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: CHAT.text, marginBottom: 6 }}>
                {t('workspace.copilotEmpty')}
              </div>
              <div style={{ fontSize: 12, color: CHAT.textMuted, lineHeight: 1.7, marginBottom: 18 }}>
                {ownerSessionKey || currentSessionKey
                  ? t('workspace.copilotScopedDesc')
                  : t('workspace.copilotEmptyDesc')}
              </div>
              <Button
                theme="solid"
                type="primary"
                icon={<IconSend size="small" />}
                onClick={startScopedSession}
                style={{ borderRadius: 9, background: CHAT.accent, borderColor: CHAT.accent }}
              >
                {t('workspace.startScopedChat')}
              </Button>
            </div>
          )}
        </div>

        {/* ---------- 输入区：引用条 + 快捷动作 ---------- */}
        <ChatComposer
          compact
          disabled={!scoped || !currentSessionKey}
          draft={draft}
          onDraftChange={setDraft}
          prefixBuilder={prefixBuilder}
          placeholder={
            queueLength > 0 ? t('workspace.queued', { count: queueLength }) : t('workspace.copilotPlaceholder')
          }
          hint={t('workspace.copilotHint')}
          headerSlot={
            activeRef ? (
              <div
                style={{
                  padding: '8px 10px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 11.5,
                      color: CHAT.accent,
                      background: CHAT.accentSoft,
                      border: `1px solid ${CHAT.accentBorder}`,
                      borderRadius: 999,
                      padding: '2px 8px',
                      maxWidth: '100%',
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {t('workspace.referenceNode', { name: activeRef.nodeTitle })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRefDismissed(activeRef.nodeId)}
                      aria-label={t('workspace.clearReference')}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: CHAT.accent,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0,
                        flexShrink: 0,
                      }}
                    >
                      <IconClose size="extra-small" />
                    </button>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {(['explain', 'optimize', 'rename'] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      disabled={streaming}
                      onClick={() => quickAction(kind)}
                      style={{
                        border: `1px solid ${CHAT.line}`,
                        background: 'var(--g-bg-raised)',
                        color: CHAT.textSub,
                        fontSize: 11.5,
                        borderRadius: 999,
                        padding: '2px 9px',
                        cursor: streaming ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        opacity: streaming ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (streaming) return;
                        e.currentTarget.style.borderColor = CHAT.accent;
                        e.currentTarget.style.color = CHAT.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = CHAT.line;
                        e.currentTarget.style.color = CHAT.textSub;
                      }}
                    >
                      {kind === 'explain'
                        ? t('workspace.quickExplain')
                        : kind === 'optimize'
                          ? t('workspace.quickOptimize')
                          : t('workspace.quickRename')}
                    </button>
                  ))}
                </div>
              </div>
            ) : null
          }
        />

        {/* 在引用节点时，让用户知道这句话会带上上下文 */}
        {activeRef && (
          <div
            style={{
              padding: '0 12px 8px',
              fontSize: 10.5,
              color: CHAT.textFaint,
              flexShrink: 0,
            }}
          >
            {t('workspace.referenceHint')}
          </div>
        )}

        {/* 工具确认：窄容器里用覆盖层 */}
    </div>
  );
};

export default CopilotSidebar;
