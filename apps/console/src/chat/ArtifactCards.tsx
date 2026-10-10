/**
 * 对话流里的产物卡 —— artifact 一等实体在叙事线上的呈现面。
 *
 * 四张卡共用一个信念：过程与证据要「长在消息旁边」，而不是躲在面板里。
 *   · ApplyWorkflowCard —— 落版是人机交接点：先看懂「将变更什么」，再决定应用与否
 *   · TestReportCard    —— 试运行证据（输入/输出/taskId），「show evidence, not assertions」
 *   · ReleaseCard       —— 发布收口：对话走到 API 的终点，给出可复制的调用方式
 *   · LiveCanvasCard    —— run 期间的画布活卡：随 artifact 版本原地生长，结束时定格
 */
import React, { useMemo, useState } from 'react';
import { Button, Modal, Popover, Tooltip } from '@douyinfe/semi-ui';
import {
  IconAlertCircle,
  IconChevronDown,
  IconCopy,
  IconExternalOpen,
  IconPlay,
  IconTickCircle,
} from '@douyinfe/semi-icons';

import { computeThumbnail, thumbTone, workflowDocumentStore } from '../document';
import type { AgentArtifactDto } from '../agent/types';
import { t } from '../i18n';
import { CHAT } from './theme';
import { ReadonlyCanvas } from '../ai-workspace/artifact/ReadonlyCanvas';

const THUMB_W = 116;
const THUMB_H = 46;

/** 迷你拓扑缩略（与 CanvasSnapshotCard 同源，卡片间保持一致的心智） */
export const MiniTopology: React.FC<{ dsl: any; width?: number; height?: number }> = ({
  dsl,
  width = THUMB_W,
  height = THUMB_H,
}) => {
  const layout = useMemo(() => computeThumbnail(dsl, width, height), [dsl, width, height]);
  if (layout.nodes.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          borderRadius: 8,
          border: `1px solid ${CHAT.lineSoft}`,
          background: CHAT.bgSunken,
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        borderRadius: 8,
        border: `1px solid ${CHAT.lineSoft}`,
        background: 'var(--g-bg-sunken)',
        flexShrink: 0,
        display: 'block',
      }}
      role="img"
      aria-label={t('chat.snapshotThumbAlt')}
    >
      {layout.edges.map((edge, index) => (
        <line
          key={index}
          x1={edge.x1}
          y1={edge.y1}
          x2={edge.x2}
          y2={edge.y2}
          style={{ stroke: CHAT.line }}
          strokeWidth={0.8}
        />
      ))}
      {layout.nodes.map((node) => (
        <rect
          key={node.id}
          x={node.x}
          y={node.y}
          width={node.w}
          height={node.h}
          rx={2}
          fill={thumbTone(node.type)}
          opacity={0.9}
        />
      ))}
    </svg>
  );
};

const Chip: React.FC<{ color?: string; children: React.ReactNode }> = ({ color, children }) => (
  <span
    style={{
      fontSize: 11.5,
      color: color || CHAT.textSub,
      background: CHAT.bgSunken,
      border: `1px solid ${CHAT.lineSoft}`,
      borderRadius: 6,
      padding: '1px 6px',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </span>
);

const CardShell: React.FC<{ border?: string; children: React.ReactNode }> = ({
  border,
  children,
}) => (
  <div
    className="chat-fade"
    style={{
      margin: '6px 0',
      border: `1px solid ${border || CHAT.line}`,
      borderRadius: 13,
      background: CHAT.bg,
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

// ---------------- 应用卡片（applyWorkflow 确认门禁的对话流呈现） ----------------

/** diff 明细行：符号 + id/连线（等宽字体） */
const DiffRow: React.FC<{ sign: string; id: string; color: string }> = ({ sign, id, color }) => (
  <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
    <span style={{ color, fontWeight: 600, flexShrink: 0 }}>{sign}</span>
    <span
      style={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
        color: CHAT.textSub,
        wordBreak: 'break-all',
      }}
    >
      {id}
    </span>
  </div>
);

interface WorkflowDiffResult {
  nodes: { added: string[]; removed: string[]; changed: string[] };
  edges: { added: string[]; removed: string[] };
}

/** 客户端工作流 diff（write_workflow 待确认参数 vs 当前画布），与后端 WorkflowDiffService 同语义 */
function diffWorkflows(
  current: { nodes?: any[]; edges?: any[] },
  proposed: { nodes: any[]; edges: any[] }
): WorkflowDiffResult {
  const result: WorkflowDiffResult = {
    nodes: { added: [], removed: [], changed: [] },
    edges: { added: [], removed: [] },
  };
  const currentNodeById = new Map<string, any>();
  for (const n of current.nodes || []) {
    if (n?.id) currentNodeById.set(String(n.id), n);
  }
  const proposedIds = new Set<string>();
  for (const n of proposed.nodes || []) {
    const id = n?.id != null ? String(n.id) : null;
    if (!id) {
      // 无 id 的新节点按 type+title 生成展示名
      result.nodes.added.push(`${n?.type || 'node'}${n?.title ? `(${n.title})` : ''}`);
      continue;
    }
    proposedIds.add(id);
    const prev = currentNodeById.get(id);
    if (!prev) {
      result.nodes.added.push(id);
    } else {
      // 语义对比：剥掉坐标（坐标变更不算 diff，自动布局会大面积改坐标）
      const semantic = (node: any) => {
        const copy = { ...node };
        if (copy.meta) copy.meta = { ...copy.meta, position: undefined };
        return JSON.stringify(copy);
      };
      if (semantic(prev) !== semantic(n)) result.nodes.changed.push(id);
    }
  }
  for (const id of currentNodeById.keys()) {
    if (!proposedIds.has(id)) result.nodes.removed.push(id);
  }

  const edgeKey = (e: any) => {
    const from = e?.sourceNodeID ?? e?.from;
    const to = e?.targetNodeID ?? e?.to;
    const port = e?.sourcePortID ?? e?.fromPort;
    return `${from}→${to}${port ? `@${port}` : ''}`;
  };
  const currentEdges = new Set((current.edges || []).map(edgeKey));
  const proposedEdges = new Set((proposed.edges || []).map(edgeKey));
  for (const key of proposedEdges) if (!currentEdges.has(key)) result.edges.added.push(key);
  for (const key of currentEdges) if (!proposedEdges.has(key)) result.edges.removed.push(key);
  return result;
}

export const ApplyWorkflowCard: React.FC<{
  args: Record<string, any>;
  onResolve: (approved: boolean) => void;
}> = ({ args, onResolve }) => {
  const proposedDsl = useMemo(
    () => ({
      nodes: Array.isArray(args?.nodes) ? args.nodes : [],
      edges: Array.isArray(args?.edges) ? args.edges : [],
    }),
    [args]
  );
  const current = workflowDocumentStore.getSnapshot().doc.toJSON();
  /** 节点/连线级 diff（与后端 WorkflowDiffService 同语义：id 对齐，坐标变更不计） */
  const diff = useMemo(() => diffWorkflows(current, proposedDsl), [current, proposedDsl]);

  const hasDiff = diff.nodes.added.length > 0 || diff.nodes.removed.length > 0
    || diff.nodes.changed.length > 0 || diff.edges.added.length > 0 || diff.edges.removed.length > 0;

  return (
    <CardShell border={CHAT.accentBorder}>
      <div style={{ display: 'flex', gap: 12, padding: '12px 14px' }}>
        <MiniTopology dsl={proposedDsl} width={132} height={52} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* 标题行：左accent条 + 主标题 + 工作流名（dsh 式层级） */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            <span
              style={{
                flexShrink: 0,
                width: 3,
                height: 14,
                borderRadius: 2,
                background: CHAT.accent,
                display: 'inline-block',
                alignSelf: 'center',
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: CHAT.text, flexShrink: 0 }}>
              {t('chat.applyWorkflowTitle')}
            </span>
            {args?.workflowName && (
              <span
                style={{
                  fontSize: 12.5,
                  color: CHAT.accent,
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {String(args.workflowName)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <Chip>
              {t('chat.snapshotNodes', { nodes: proposedDsl.nodes.length, edges: proposedDsl.edges.length })}
            </Chip>
            {diff.nodes.added.length > 0 && (
              <Chip color={CHAT.success}>
                {t('chat.snapshotAddedNodes', { count: diff.nodes.added.length })}
              </Chip>
            )}
            {diff.nodes.removed.length > 0 && (
              <Chip color={CHAT.danger}>
                {t('chat.snapshotRemovedNodes', { count: diff.nodes.removed.length })}
              </Chip>
            )}
            {diff.nodes.changed.length > 0 && (
              <Chip color="#b7791f">~{diff.nodes.changed.length}</Chip>
            )}
            {diff.edges.added.length > 0 && <Chip color={CHAT.success}>+{diff.edges.added.length} →</Chip>}
            {diff.edges.removed.length > 0 && <Chip color={CHAT.danger}>-{diff.edges.removed.length} →</Chip>
            }
          </div>
          {hasDiff && (
            <details style={{ fontSize: 11.5, color: CHAT.textSub }}>
              <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
                {t('chat.applyDiffDetail')}
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                {diff.nodes.added.map((id) => (
                  <DiffRow key={`a-${id}`} sign="+" id={id} color={CHAT.success} />
                ))}
                {diff.nodes.changed.map((id) => (
                  <DiffRow key={`c-${id}`} sign="~" id={id} color="#b7791f" />
                ))}
                {diff.nodes.removed.map((id) => (
                  <DiffRow key={`r-${id}`} sign="-" id={id} color={CHAT.danger} />
                ))}
                {diff.edges.added.map((e) => (
                  <DiffRow key={`ea-${e}`} sign="+" id={e} color={CHAT.success} />
                ))}
                {diff.edges.removed.map((e) => (
                  <DiffRow key={`er-${e}`} sign="-" id={e} color={CHAT.danger} />
                ))}
              </div>
            </details>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto', alignItems: 'center' }}>
            <Button
              size="small"
              theme="solid"
              type="primary"
              icon={<IconTickCircle size="small" />}
              onClick={() => onResolve(true)}
              style={{ borderRadius: 7, background: CHAT.accent, borderColor: CHAT.accent }}
            >
              {t('chat.applyWorkflowApprove')}
            </Button>
            <Button
              size="small"
              theme="borderless"
              type="tertiary"
              onClick={() => onResolve(false)}
              style={{ borderRadius: 7, color: CHAT.textMuted }}
            >
              {t('chat.applyWorkflowReject')}
            </Button>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: CHAT.textFaint }}>
              {t('chat.applyWorkflowHint')}
            </span>
          </div>
        </div>
      </div>
    </CardShell>
  );
};

// ---------------- 试运行报告卡（test_report 产物） ----------------

export const TestReportCard: React.FC<{ artifact: AgentArtifactDto }> = ({ artifact }) => {
  const payload = artifact.payload || {};
  const failed = typeof payload.status === 'string'
    ? /fail|error|timeout/i.test(payload.status)
    : payload.success === false;
  const outputJson = useMemo(() => {
    try {
      return JSON.stringify(payload.outputs ?? payload.executeResult ?? payload, null, 2);
    } catch {
      return '';
    }
  }, [payload]);

  return (
    <CardShell border={failed ? 'var(--g-danger-soft)' : CHAT.line}>
      <div style={{ display: 'flex', gap: 10, padding: '10px 12px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: failed ? 'var(--g-danger-soft)' : 'var(--g-success-soft, rgba(0,180,90,.12))',
            color: failed ? CHAT.danger : CHAT.success,
          }}
        >
          {failed ? <IconAlertCircle size="small" /> : <IconPlay size="small" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: CHAT.text }}>
              {artifact.title || t('chat.testReportTitle')}
            </span>
            <Chip color={failed ? CHAT.danger : CHAT.success}>{artifact.summary}</Chip>
          </div>
          {payload?.taskId && (
            <div style={{ marginTop: 4, fontSize: 11, color: CHAT.textFaint }}>
              taskId: {String(payload.taskId)}
            </div>
          )}
          {outputJson && (
            <Popover
              position="topLeft"
              trigger="click"
              content={
                <pre
                  style={{
                    margin: 0,
                    maxWidth: 420,
                    maxHeight: 280,
                    overflow: 'auto',
                    fontSize: 11,
                    lineHeight: 1.6,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}
                >
                  {outputJson}
                </pre>
              }
            >
              <Button
                size="small"
                theme="borderless"
                type="tertiary"
                icon={<IconChevronDown size="small" />}
                iconPosition="right"
                style={{ borderRadius: 7, color: CHAT.textMuted, marginTop: 4 }}
              >
                {t('chat.testReportOutputs')}
              </Button>
            </Popover>
          )}
        </div>
      </div>
    </CardShell>
  );
};

// ---------------- 发布收口卡（release 产物） ----------------

export const ReleaseCard: React.FC<{ artifact: AgentArtifactDto }> = ({ artifact }) => {
  const payload = artifact.payload || {};
  const [isCopied, setIsCopied] = useState(false);

  const copyInvokeUrl = () => {
    void navigator.clipboard.writeText(String(payload.invokeUrl || ''));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <CardShell border={CHAT.success}>
      <div style={{ display: 'flex', gap: 10, padding: '10px 12px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--g-success-soft, rgba(0,180,90,.12))',
            color: CHAT.success,
          }}
        >
          <IconExternalOpen size="small" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: CHAT.text }}>
              {artifact.title || t('chat.releaseTitle')}
            </span>
            {payload?.versionNumber && <Chip>v{String(payload.versionNumber)}</Chip>}
          </div>
          {payload?.invokeUrl && (
            <div
              style={{
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
                color: CHAT.textSub,
                background: CHAT.bgSunken,
                border: `1px solid ${CHAT.lineSoft}`,
                borderRadius: 7,
                padding: '5px 8px',
              }}
            >
              <code style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                POST {String(payload.invokeUrl)}
              </code>
              <Tooltip content={isCopied ? t('chat.copied') : t('chat.copy')}>
                <button
                  type="button"
                  onClick={copyInvokeUrl}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: CHAT.textMuted,
                    cursor: 'pointer',
                    display: 'flex',
                    padding: 2,
                  }}
                >
                  <IconCopy size="small" />
                </button>
              </Tooltip>
            </div>
          )}
          {payload?.apiKeyMasked && (
            <div style={{ marginTop: 4, fontSize: 11, color: CHAT.textFaint }}>
              {t('chat.releaseKeyHint')}: {String(payload.apiKeyMasked)}
            </div>
          )}
        </div>
      </div>
    </CardShell>
  );
};

// ---------------- 画布活卡（run 期间随 artifact 版本原地生长） ----------------

export const LiveCanvasCard: React.FC<{ artifact: AgentArtifactDto }> = ({ artifact }) => {
  const dsl = {
    nodes: Array.isArray(artifact.payload?.nodes) ? artifact.payload.nodes : [],
    edges: Array.isArray(artifact.payload?.edges) ? artifact.payload.edges : [],
  };
  return (
    <div
      className="chat-fade"
      style={{
        margin: '6px 0',
        border: `1px dashed ${CHAT.accentBorder}`,
        borderRadius: 13,
        background: CHAT.bg,
        padding: '10px 12px',
        display: 'flex',
        gap: 11,
        alignItems: 'center',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <MiniTopology dsl={dsl} width={132} height={52} />
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: CHAT.accent,
            animation: 'chat-typing 1.2s infinite ease-in-out',
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: CHAT.accent }}>
            {t('chat.buildingCanvas')}
          </span>
          <Chip>{`v${artifact.version}`}</Chip>
        </div>
        <div style={{ marginTop: 4, fontSize: 11.5, color: CHAT.textMuted }}>
          {t('chat.snapshotNodes', { nodes: dsl.nodes.length, edges: dsl.edges.length })}
          {artifact.summary ? ` · ${artifact.summary}` : ''}
        </div>
      </div>
    </div>
  );
};

// ---------------- 懒加载真实画布（当前版快照卡的渲染升级） ----------------

/** 滚动到可视区才挂 flowgram 实例；同一时刻渲染中的实例数由「仅当前版卡启用」控制 */
export const LazyRealCanvas: React.FC<{ dsl: any; height?: number }> = ({ dsl, height = 200 }) => {
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  if (!dsl?.nodes?.length) return null;

  return (
    <div
      ref={ref}
      style={{ height, borderTop: `1px solid ${CHAT.lineSoft}`, background: 'var(--g-bg-sunken)' }}
    >
      {visible && !failed ? (
        <CanvasErrorBoundary onFail={() => setFailed(true)}>
          <ReadonlyCanvas dsl={dsl} />
        </CanvasErrorBoundary>
      ) : (
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11.5,
            color: CHAT.textFaint,
          }}
        >
          {t('chat.realCanvasLoading')}
        </div>
      )}
    </div>
  );
};

class CanvasErrorBoundary extends React.Component<
  { onFail: () => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** 卡片内嵌真渲染 + 点击 Modal 放大（当前版卡专用） */
export const RealCanvasPreview: React.FC<{ dsl: any; height?: number }> = ({ dsl, height = 200 }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <div
        style={{ cursor: 'zoom-in' }}
        onClick={() => dsl?.nodes?.length && setExpanded(true)}
      >
        <LazyRealCanvas dsl={dsl} height={height} />
      </div>
      <Modal
        title={t('chat.realCanvasFull')}
        visible={expanded}
        onCancel={() => setExpanded(false)}
        footer={null}
        width={Math.min(860, typeof window !== 'undefined' ? window.innerWidth - 80 : 860)}
        bodyStyle={{ height: '60vh', padding: 0 }}
      >
        {expanded && <ReadonlyCanvas dsl={dsl} />}
      </Modal>
    </>
  );
};
