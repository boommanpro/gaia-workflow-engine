/**
 * CanvasSnapshotCard —— 把「画布这一轮变成了什么样」直接放进对话流。
 *
 * 为什么不做成右侧面板的缩略版：
 *   右侧面板是「我要专注看画布」时才去的地方；而在对话里，用户关心的是
 *   「AI 刚才那一轮到底对我的图做了什么、做得对不对」。
 *   后者是**叙事性**问题，答案必须长在消息旁边，而不是另一个面板里。
 *
 * 所以每张卡给四样东西：
 *   1. 一眼认得出的缩略拓扑（形状对不对，看着就知道）
 *   2. 一句话说清改了什么（+3 节点 · −1 连线）
 *   3. 想看细节 → 对比上一版（列出增删改的节点名）
 *   4. 改坏了 → 回滚到此（不删历史，随时能回来）
 *
 * 失败轮走另一套外观：红色、说明「画布已保护」，给重试而不是回滚 ——
 * 因为那一轮根本没写进画布，没什么可回滚的。
 */
import React, { useMemo, useState } from 'react';
import { Button, Popover, Tooltip } from '@douyinfe/semi-ui';
import {
  IconAlertCircle,
  IconRefresh,
  IconUndo,
  IconExternalOpen,
  IconChevronDown,
} from '@douyinfe/semi-icons';

import {
  computeThumbnail,
  describeNodeDelta,
  thumbTone,
  type CanvasSnapshot,
} from '../document';

import { t } from '../i18n';
import { CHAT } from './theme';

export interface CanvasSnapshotCardProps {
  snapshot: CanvasSnapshot;
  /** 版本序号（从 1 开始，用于「v3」这类展示） */
  versionNo: number;
  /** 是否是当前生效的那一版 */
  isCurrent?: boolean;
  /** 窄容器（专家模式侧边栏）用紧凑形态 */
  compact?: boolean;
  /** 打开画布（通用模式展开右侧产物面板 / 专家模式聚焦画布） */
  onView?: () => void;
  /** 回滚到这一版 */
  onRollback?: () => void;
  /** 失败轮重试 */
  onRetry?: () => void;
}

const THUMB_W = 116;
const THUMB_H = 46;
const THUMB_W_COMPACT = 52;
const THUMB_H_COMPACT = 30;

const MiniTopology: React.FC<{ snapshot: CanvasSnapshot; compact?: boolean }> = ({
  snapshot,
  compact,
}) => {
  const width = compact ? THUMB_W_COMPACT : THUMB_W;
  const height = compact ? THUMB_H_COMPACT : THUMB_H;
  const layout = useMemo(
    () => computeThumbnail(snapshot.dsl, width, height),
    [snapshot.dsl, width, height]
  );

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
        background: '#fcfcfe',
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
          stroke={CHAT.line}
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

const Chip: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <span
    style={{
      fontSize: 11.5,
      color,
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

/** 变更摘要 chips：只显示非零项；首版不显示「+N」，那没有意义 */
const DeltaChips: React.FC<{ snapshot: CanvasSnapshot }> = ({ snapshot }) => {
  const { delta } = snapshot;

  if (!snapshot.prevDsl) {
    return (
      <Chip color={CHAT.textSub}>
        {t('chat.snapshotInitial', { nodes: snapshot.nodeCount, edges: snapshot.edgeCount })}
      </Chip>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {delta.addedNodes > 0 && <Chip color={CHAT.success}>{t('chat.snapshotAddedNodes', { count: delta.addedNodes })}</Chip>}
      {delta.updatedNodes > 0 && <Chip color={CHAT.warn}>{t('chat.snapshotUpdatedNodes', { count: delta.updatedNodes })}</Chip>}
      {delta.removedNodes > 0 && <Chip color={CHAT.danger}>{t('chat.snapshotRemovedNodes', { count: delta.removedNodes })}</Chip>}
      {delta.addedEdges > 0 && <Chip color={CHAT.textSub}>{t('chat.snapshotAddedEdges', { count: delta.addedEdges })}</Chip>}
      {delta.removedEdges > 0 && <Chip color={CHAT.textSub}>{t('chat.snapshotRemovedEdges', { count: delta.removedEdges })}</Chip>}
    </div>
  );
};

const DeltaDetailList: React.FC<{ label: string; items: string[]; color: string }> = ({
  label,
  items,
  color,
}) => {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11.5, color, fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {items.map((name, index) => (
          <span
            key={`${name}-${index}`}
            style={{
              fontSize: 11.5,
              color: CHAT.textSub,
              background: CHAT.bgSunken,
              borderRadius: 5,
              padding: '1px 6px',
            }}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
};

export const CanvasSnapshotCard: React.FC<CanvasSnapshotCardProps> = ({
  snapshot,
  versionNo,
  isCurrent,
  compact,
  onView,
  onRollback,
  onRetry,
}) => {
  const [rollbackOpen, setRollbackOpen] = useState(false);

  const reasonLabel = useMemo(() => {
    switch (snapshot.reason) {
      case 'ai-generate':
        return t('chat.snapshotReasonGenerate');
      case 'ai-edit':
        return t('chat.snapshotReasonAiEdit');
      case 'user-edit':
        return t('chat.snapshotReasonUserEdit');
      case 'user-layout':
        return t('chat.snapshotReasonLayout');
      case 'rollback':
        return t('chat.snapshotReasonRollback');
      case 'import':
        return t('chat.snapshotReasonImport');
      default:
        return t('chat.snapshotReasonInit');
    }
  }, [snapshot.reason]);

  // ---------- 失败轮：这一轮没写进画布 ----------
  if (snapshot.outcome === 'failed') {
    return (
      <div
        className="chat-fade"
        style={{
          margin: compact ? '4px 0' : '6px 0',
          border: `1px solid #f6d9d9`,
          borderRadius: 12,
          background: '#fffafa',
          padding: compact ? '8px 10px' : '10px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <IconAlertCircle size="small" style={{ color: CHAT.danger }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: CHAT.danger }}>
            {t('chat.snapshotFailedTitle')}
          </span>
        </div>
        <div style={{ fontSize: 12, color: CHAT.textSub, lineHeight: 1.6 }}>
          {snapshot.failureNote || t('chat.snapshotFailedDesc')}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {onRetry && (
            <Button
              size="small"
              theme="light"
              type="primary"
              icon={<IconRefresh size="small" />}
              onClick={onRetry}
              style={{ borderRadius: 7 }}
            >
              {t('chat.snapshotRetry')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const compareContent = (
    <div style={{ width: 230, maxHeight: 260, overflow: 'auto' }}>
      {(() => {
        const detail = describeNodeDelta(snapshot.dsl, snapshot.prevDsl);
        if (detail.added.length + detail.removed.length + detail.updated.length === 0) {
          return <div style={{ fontSize: 12, color: CHAT.textMuted }}>{t('chat.snapshotNoDelta')}</div>;
        }
        return (
          <>
            <DeltaDetailList label={t('chat.snapshotDetailAdded')} items={detail.added} color={CHAT.success} />
            <DeltaDetailList label={t('chat.snapshotDetailUpdated')} items={detail.updated} color={CHAT.warn} />
            <DeltaDetailList label={t('chat.snapshotDetailRemoved')} items={detail.removed} color={CHAT.danger} />
          </>
        );
      })()}
    </div>
  );

  // ---------- 紧凑形态（专家模式侧边栏） ----------
  if (compact) {
    return (
      <div
        className="chat-fade"
        style={{
          margin: '4px 0',
          border: `1px solid ${isCurrent ? CHAT.accentBorder : CHAT.line}`,
          borderRadius: 11,
          background: isCurrent ? CHAT.accentSoft : CHAT.bgSunken,
          padding: '7px 9px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <MiniTopology snapshot={snapshot} compact />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: isCurrent ? CHAT.accent : CHAT.text }}>
              {t('chat.snapshotVersion', { n: versionNo })}
            </span>
            {isCurrent && (
              <span style={{ fontSize: 11, color: CHAT.accent }}>{t('chat.snapshotCurrent')}</span>
            )}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: CHAT.textMuted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: 2,
            }}
          >
            {reasonLabel}
          </div>
        </div>
        {!isCurrent && onRollback && (
          <Tooltip content={t('chat.snapshotRollbackTo', { n: versionNo })} position="topRight">
            <button
              type="button"
              onClick={() => setRollbackOpen(true)}
              aria-label={t('chat.snapshotRollback')}
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                border: 'none',
                background: 'transparent',
                color: CHAT.textMuted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.color = CHAT.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = CHAT.textMuted;
              }}
            >
              <IconUndo size="small" />
            </button>
          </Tooltip>
        )}
        {rollbackOpen && (
          <RollbackConfirm
            versionNo={versionNo}
            onCancel={() => setRollbackOpen(false)}
            onConfirm={() => {
              setRollbackOpen(false);
              onRollback?.();
            }}
          />
        )}
      </div>
    );
  }

  // ---------- 完整形态（通用模式对话栏） ----------
  return (
    <div
      className="chat-fade"
      style={{
        margin: '6px 0',
        border: `1px solid ${isCurrent ? CHAT.accentBorder : CHAT.line}`,
        borderRadius: 13,
        background: CHAT.bg,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', gap: 11, padding: '11px 12px' }}>
        <MiniTopology snapshot={snapshot} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: CHAT.text }}>
              {t('chat.snapshotVersion', { n: versionNo })}
            </span>
            <span style={{ fontSize: 11.5, color: CHAT.textMuted }}>{reasonLabel}</span>
            {isCurrent && (
              <span
                style={{
                  fontSize: 11,
                  color: CHAT.accent,
                  background: CHAT.accentSoft,
                  borderRadius: 5,
                  padding: '1px 6px',
                }}
              >
                {t('chat.snapshotCurrent')}
              </span>
            )}
          </div>

          <DeltaChips snapshot={snapshot} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
            {!isCurrent && onRollback && (
              <Button
                size="small"
                theme="light"
                type="primary"
                icon={<IconUndo size="small" />}
                onClick={() => setRollbackOpen(true)}
                style={{ borderRadius: 7 }}
              >
                {t('chat.snapshotRollback')}
              </Button>
            )}
            {onView && (
              <Button
                size="small"
                theme="borderless"
                type="tertiary"
                icon={<IconExternalOpen size="small" />}
                onClick={onView}
                style={{ borderRadius: 7 }}
              >
                {t('chat.snapshotView')}
              </Button>
            )}
            <Popover content={compareContent} position="topLeft" trigger="click">
              <Button
                size="small"
                theme="borderless"
                type="tertiary"
                icon={<IconChevronDown size="small" />}
                iconPosition="right"
                style={{ borderRadius: 7, color: CHAT.textMuted }}
              >
                {t('chat.snapshotCompare')}
              </Button>
            </Popover>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: CHAT.textFaint }}>
              {t('chat.snapshotNodes', { nodes: snapshot.nodeCount, edges: snapshot.edgeCount })}
            </span>
          </div>
        </div>
      </div>

      {rollbackOpen && (
        <RollbackConfirm
          versionNo={versionNo}
          onCancel={() => setRollbackOpen(false)}
          onConfirm={() => {
            setRollbackOpen(false);
            onRollback?.();
          }}
        />
      )}
    </div>
  );
};

/** 回滚确认：强调「不会删历史」，把用户唯一的顾虑说清楚 */
const RollbackConfirm: React.FC<{
  versionNo: number;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ versionNo, onCancel, onConfirm }) => (
  <div
    style={{
      borderTop: `1px solid ${CHAT.lineSoft}`,
      background: CHAT.bgSunken,
      padding: '9px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}
  >
    <span style={{ fontSize: 12, color: CHAT.textSub, flex: 1, lineHeight: 1.5 }}>
      {t('chat.snapshotRollbackConfirm', { n: versionNo })}
    </span>
    <Button size="small" theme="borderless" type="tertiary" onClick={onCancel} style={{ borderRadius: 7 }}>
      {t('Cancel')}
    </Button>
    <Button
      size="small"
      theme="solid"
      type="primary"
      onClick={onConfirm}
      style={{ borderRadius: 7, background: CHAT.accent, borderColor: CHAT.accent }}
    >
      {t('chat.snapshotRollbackDo')}
    </Button>
  </div>
);

export default CanvasSnapshotCard;
