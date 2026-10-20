/**
 * DeltaDetailsView —— 字段级差异的统一渲染（阶段 2.3）。
 *
 * 两处使用：
 *   1. 对话流快照卡的「对比上一版」弹层；
 *   2. 专家模式的「AI 待应用变更」差异预览弹窗。
 * 目标只有一个：回答「哪里变了、从什么变成什么」，纯连线修改不再显示「无差异」。
 */
import React from 'react';

import { t } from '../i18n';
import { CHAT } from '../chat/theme';
import type { DslChangeDetails, FieldChange, NodeChangeDetail } from './history';

const SectionTitle: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <div style={{ fontSize: 11.5, color, fontWeight: 600, margin: '8px 0 4px' }}>{children}</div>
);

const ValueChip: React.FC<{ text: string; tone?: 'plain' | 'old' | 'new' }> = ({ text, tone = 'plain' }) => (
  <span
    style={{
      fontSize: 11,
      borderRadius: 4,
      padding: '0 4px',
      maxWidth: 200,
      display: 'inline-block',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      verticalAlign: 'bottom',
      ...(tone === 'old'
        ? { background: 'var(--g-danger-soft)', color: CHAT.danger, textDecoration: 'line-through' }
        : tone === 'new'
          ? { background: 'var(--g-success-soft)', color: CHAT.success }
          : { background: CHAT.bgSunken, color: CHAT.textSub }),
    }}
    title={text}
  >
    {text}
  </span>
);

const FieldLine: React.FC<{ field: FieldChange }> = ({ field }) => (
  <div style={{ fontSize: 11.5, color: CHAT.textSub, lineHeight: 1.7, paddingLeft: 10 }}>
    <code style={{ fontSize: 10.5, color: CHAT.text }}>{field.path}</code>
    {'  '}
    <ValueChip text={field.before} tone="old" />
    <span style={{ color: CHAT.textFaint, margin: '0 4px' }}>→</span>
    <ValueChip text={field.after} tone="new" />
  </div>
);

const NodeBlock: React.FC<{ node: NodeChangeDetail }> = ({ node }) => {
  const color =
    node.change === 'added' ? CHAT.success : node.change === 'removed' ? CHAT.danger : CHAT.warn;
  const prefix = node.change === 'added' ? '+' : node.change === 'removed' ? '−' : '~';
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 12, color: CHAT.text, fontWeight: 600 }}>
        <span style={{ color, marginRight: 4 }}>{prefix}</span>
        {node.title}
        {node.type ? (
          <span style={{ fontSize: 10.5, color: CHAT.textFaint, marginLeft: 6, fontWeight: 400 }}>{node.type}</span>
        ) : null}
      </div>
      {(node.fields || []).map((f) => (
        <FieldLine key={f.path} field={f} />
      ))}
    </div>
  );
};

export const DeltaDetailsView: React.FC<{ details: DslChangeDetails }> = ({ details }) => {
  const added = details.nodes.filter((n) => n.change === 'added');
  const updated = details.nodes.filter((n) => n.change === 'updated');
  const removed = details.nodes.filter((n) => n.change === 'removed');
  const edgesAdded = details.edges.filter((e) => e.change === 'added');
  const edgesRemoved = details.edges.filter((e) => e.change === 'removed');

  if (
    details.nodes.length === 0 && details.edges.length === 0
  ) {
    return <div style={{ fontSize: 12, color: CHAT.textMuted }}>{t('chat.snapshotNoDelta')}</div>;
  }

  return (
    <div>
      {added.length > 0 && <SectionTitle color={CHAT.success}>{t('chat.snapshotDetailAdded')}</SectionTitle>}
      {added.map((n) => <NodeBlock key={`a-${n.nodeId}`} node={n} />)}
      {updated.length > 0 && <SectionTitle color={CHAT.warn}>{t('chat.snapshotDetailUpdated')}</SectionTitle>}
      {updated.map((n) => <NodeBlock key={`u-${n.nodeId}`} node={n} />)}
      {removed.length > 0 && <SectionTitle color={CHAT.danger}>{t('chat.snapshotDetailRemoved')}</SectionTitle>}
      {removed.map((n) => <NodeBlock key={`r-${n.nodeId}`} node={n} />)}
      {(edgesAdded.length > 0 || edgesRemoved.length > 0) && (
        <SectionTitle color={CHAT.textSub}>{t('chat.diffEdges')}</SectionTitle>
      )}
      {edgesAdded.map((e) => (
        <div key={`ea-${e.key}`} style={{ fontSize: 11.5, color: CHAT.textSub, lineHeight: 1.7 }}>
          <span style={{ color: CHAT.success, marginRight: 4 }}>+</span>
          {e.fromTitle} <span style={{ color: CHAT.textFaint }}>→</span> {e.toTitle}
          {e.fromPort ? <span style={{ fontSize: 10.5, color: CHAT.textFaint }}>（端口 {e.fromPort}）</span> : null}
        </div>
      ))}
      {edgesRemoved.map((e) => (
        <div key={`er-${e.key}`} style={{ fontSize: 11.5, color: CHAT.textSub, lineHeight: 1.7 }}>
          <span style={{ color: CHAT.danger, marginRight: 4 }}>−</span>
          {e.fromTitle} <span style={{ color: CHAT.textFaint }}>→</span> {e.toTitle}
          {e.fromPort ? <span style={{ fontSize: 10.5, color: CHAT.textFaint }}>（端口 {e.fromPort}）</span> : null}
        </div>
      ))}
    </div>
  );
};

export default DeltaDetailsView;
