/**
 * 工作流产物面板 —— 「工作流是 AI 的最终产物」的主呈现区。
 *
 * 三重视角切换：
 *   预览：给人看的（节点构成 + 执行链路 + 校验结论）
 *   画布：给眼睛看的（只读 flowgram 画布）
 *   DSL：给机器看的（可直接复制/下载落版）
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal, Tabs, Tag, Toast, Tooltip } from '@douyinfe/semi-ui';
import {
  IconCode,
  IconExternalOpen,
  IconSave,
  IconCopy,
  IconDownload,
  IconTickCircle,
  IconAlertTriangle,
  IconShrink,
} from '@douyinfe/semi-icons';

import { useWorkflowDocumentState, workflowDocumentStore, validateDsl } from '../../document';
import type { DslNode, WorkflowDsl } from '../../document';
import { t } from '../../i18n';
import { workflowApi } from '../../services/workflow-api';
import { CHAT } from '../../chat/theme';
import { ReadonlyCanvas } from './ReadonlyCanvas';

const NODE_LABELS: Record<string, string> = {
  start: '开始',
  end: '结束',
  llm: '大模型',
  code: '代码',
  http: 'HTTP 请求',
  condition: '条件判断',
  'multi-condition': '多条件',
  branches: '分支',
  loop: '循环',
  variable: '变量',
  'string-format': '字符串处理',
  assignee: '指派人',
  comment: '批注',
  workflow: '子流程',
  'block-start': '代码块开始',
  'block-end': '代码块结束',
  continue: '继续',
  break: '中断',
};

function nodeLabel(node: DslNode): string {
  const explicit = node.data?.title;
  if (typeof explicit === 'string' && explicit.trim()) return explicit;
  return NODE_LABELS[node.type] || node.type;
}

/** 从 start 出发，贪心走出一条主执行链路 */
function buildExecutionPath(dsl: WorkflowDsl): string[] {
  const byId = new Map(dsl.nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, string[]>();
  for (const edge of dsl.edges) {
    const list = outgoing.get(edge.sourceNodeID) || [];
    list.push(edge.targetNodeID);
    outgoing.set(edge.sourceNodeID, list);
  }

  const start = dsl.nodes.find((n) => n.type === 'start') || dsl.nodes[0];
  if (!start) return [];

  const path: string[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined = start.id;

  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const label = byId.get(cursor) ? nodeLabel(byId.get(cursor)!) : cursor;
    path.push(label);
    const next = outgoing.get(cursor);
    cursor = next && next.length > 0 ? next[0] : undefined;
  }
  return path;
}

type TabKey = 'preview' | 'canvas' | 'dsl';

export const ArtifactPanel: React.FC<{ onCollapse?: () => void }> = ({ onCollapse }) => {
  const { doc, meta, snapshots, cursor } = useWorkflowDocumentState();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>('preview');
  const [saveVisible, setSaveVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workflowCode, setWorkflowCode] = useState('');
  const [versionDesc, setVersionDesc] = useState('AI 生成');

  const dsl = doc.toJSON();
  const validation = useMemo(() => validateDsl(dsl), [dsl]);
  const stats = useMemo(() => doc.toStats(), [doc]);
  const executionPath = useMemo(() => buildExecutionPath(dsl), [dsl]);
  const dirty = workflowDocumentStore.isDirty;
  const isEmpty = doc.isEmpty;

  const handleSave = useCallback(async () => {
    if (!workflowCode.trim()) {
      Toast.warning(t('workspace.needCode'));
      return;
    }
    setSaving(true);
    try {
      await workflowApi.applyDsl(workflowCode.trim(), dsl, {
        workflowName: meta.workflowName || workflowCode.trim(),
        versionDesc,
        createIfMissing: true,
      });
      workflowDocumentStore.markSaved({ workflowCode: workflowCode.trim(), savedDsl: dsl });
      workflowDocumentStore.setMeta({ workflowCode: workflowCode.trim() });
      Toast.success(t('workspace.saveSuccess'));
      setSaveVisible(false);
    } catch (error) {
      Toast.error(`${t('workspace.saveFailed')}: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [dsl, meta.workflowName, versionDesc, workflowCode]);

  const handleRefine = useCallback(() => {
    // 同标签页跳转，而不是新开一个标签：
    // workflowDocumentStore 是模块级单例，同标签页里 AI 刚生成的那份 DSL 原样承接，
    // 对话会话也不会断（AgentContext 全局）。新标签会得到空 store + 空会话。
    try {
      sessionStorage.setItem('gaia.artifactDraft', JSON.stringify(dsl));
    } catch {
      /* 忽略隐私模式下的写入失败 */
    }
    const code = meta.workflowCode?.trim();
    navigate(code ? `/editor/${encodeURIComponent(code)}` : '/editor/__draft__');
  }, [dsl, meta.workflowCode, navigate]);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(dsl, null, 2));
    Toast.success(t('workspace.copied'));
  }, [dsl]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([JSON.stringify(dsl, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${meta.workflowCode || 'workflow'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [dsl, meta.workflowCode]);

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--g-bg-raised)',
        borderLeft: `1px solid ${CHAT.line}`,
      }}
    >
      {/* 头部 */}
      <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${CHAT.lineSoft}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: CHAT.text, flexShrink: 0 }}>
            {t('workspace.artifact')}
          </span>
          {snapshots.length > 0 && (
            <Tag size="small" shape="circle" style={{ background: CHAT.bgSunken, color: CHAT.textSub, border: 'none' }}>
              {t('chat.snapshotVersion', { n: cursor + 1 })}
            </Tag>
          )}
          {!isEmpty && (
            <Tag size="small" shape="circle" color={validation.valid ? 'green' : 'orange'}>
              {validation.valid
                ? t('workspace.validationPassed')
                : t('workspace.validationIssues', { count: validation.issues.length })}
            </Tag>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, flexShrink: 0 }}>
            {!isEmpty && (
              <>
                <Tooltip content={t('workspace.copyDsl')} position="bottomRight">
                  <Button
                    size="small"
                    theme="borderless"
                    type="tertiary"
                    icon={<IconCopy size="small" />}
                    onClick={handleCopy}
                    aria-label={t('workspace.copyDsl')}
                  />
                </Tooltip>
                <Tooltip content={t('workspace.downloadDsl')} position="bottomRight">
                  <Button
                    size="small"
                    theme="borderless"
                    type="tertiary"
                    icon={<IconDownload size="small" />}
                    onClick={handleDownload}
                    aria-label={t('workspace.downloadDsl')}
                  />
                </Tooltip>
              </>
            )}
            {onCollapse && (
              <Tooltip content={t('workspace.collapseArtifact')} position="bottomRight">
                <Button
                  size="small"
                  theme="borderless"
                  type="tertiary"
                  icon={<IconShrink size="small" />}
                  onClick={onCollapse}
                  aria-label={t('workspace.collapseArtifact')}
                />
              </Tooltip>
            )}
          </div>
        </div>

        {!isEmpty && (
          <div style={{ marginTop: 6, fontSize: 11.5, color: CHAT.textMuted, display: 'flex', gap: 8 }}>
            <span>
              {t('workspace.stats', { nodes: stats.nodeCount, edges: stats.edgeCount })}
            </span>
            <span>·</span>
            <span style={{ color: dirty ? CHAT.warn : CHAT.success }}>
              {dirty ? t('workspace.dirtyHint') : t('workspace.savedHint')}
            </span>
            {meta.workflowCode && (
              <>
                <span>·</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {meta.workflowCode}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {isEmpty ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 28,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: CHAT.accentSoft,
              color: CHAT.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <IconCode size="large" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: CHAT.text, marginBottom: 6 }}>
            {t('workspace.artifactEmpty')}
          </div>
          <div style={{ fontSize: 12, color: CHAT.textMuted, lineHeight: 1.7 }}>
            {t('workspace.artifactEmptyDesc')}
          </div>
        </div>
      ) : (
        <>
          <Tabs
            type="line"
            size="small"
            activeKey={tab}
            onChange={(key) => setTab(key as TabKey)}
            style={{ flexShrink: 0, padding: '0 14px' }}
          >
            <Tabs.TabPane tab={t('workspace.tabPreview')} itemKey="preview" />
            <Tabs.TabPane tab={t('workspace.tabCanvas')} itemKey="canvas" />
            <Tabs.TabPane tab={t('workspace.tabDsl')} itemKey="dsl" />
          </Tabs>

          <div className="chat-scroll" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {tab === 'preview' && (
              <div style={{ padding: '14px 14px 18px' }}>
                <SectionTitle>{t('workspace.executionPath')}</SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginBottom: 18 }}>
                  {executionPath.map((label, index) => (
                    <React.Fragment key={`${label}-${index}`}>
                      {index > 0 && <span style={{ color: CHAT.textFaint, fontSize: 11 }}>→</span>}
                      <span
                        style={{
                          padding: '4px 9px',
                          background: CHAT.bgSunken,
                          border: `1px solid ${CHAT.line}`,
                          borderRadius: 7,
                          fontSize: 11.5,
                          color: CHAT.textSub,
                        }}
                      >
                        {label}
                      </span>
                    </React.Fragment>
                  ))}
                </div>

                <SectionTitle>{t('workspace.nodesSection')}</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
                  {Object.entries(stats.nodeTypes).map(([type, count]) => (
                    <div
                      key={type}
                      style={{
                        padding: '8px 10px',
                        border: `1px solid ${CHAT.line}`,
                        borderRadius: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: 12, color: CHAT.textSub }}>{NODE_LABELS[type] || type}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: CHAT.accent }}>{count}</span>
                    </div>
                  ))}
                </div>

                <SectionTitle>{t('workspace.validation')}</SectionTitle>
                {validation.issues.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: CHAT.success, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <IconTickCircle size="small" />
                    {t('workspace.noIssues')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {validation.issues.map((issue, index) => (
                      <div
                        key={`${issue.code}-${index}`}
                        style={{
                          padding: '7px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          background: issue.level === 'error' ? CHAT.dangerSoft : CHAT.warnSoft,
                          color: issue.level === 'error' ? CHAT.danger : CHAT.warn,
                          border: `1px solid ${issue.level === 'error' ? 'var(--g-danger-soft)' : 'var(--g-warn-soft)'}`,
                          display: 'flex',
                          gap: 6,
                          alignItems: 'flex-start',
                        }}
                      >
                        <IconAlertTriangle size="small" style={{ marginTop: 1 }} />
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'canvas' && (
              <div style={{ height: '100%', minHeight: 340 }}>
                <ReadonlyCanvas dsl={dsl} />
              </div>
            )}

            {tab === 'dsl' && (
              <pre
                style={{
                  margin: 0,
                  padding: '14px 16px',
                  fontSize: 11,
                  lineHeight: 1.65,
                  color: CHAT.textSub,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {JSON.stringify(dsl, null, 2)}
              </pre>
            )}
          </div>

          {/* 主操作：先「打开」，落版是次要动作 */}
          <div
            style={{
              padding: 12,
              borderTop: `1px solid ${CHAT.lineSoft}`,
              display: 'flex',
              gap: 8,
              flexShrink: 0,
            }}
          >
            <Button
              theme="solid"
              type="primary"
              onClick={handleRefine}
              style={{ flex: 1, borderRadius: 9, background: CHAT.accent, borderColor: CHAT.accent }}
              icon={<IconExternalOpen />}
            >
              {meta.workflowCode ? t('workspace.openWorkflow') : t('workspace.openInEditor')}
            </Button>
            <Tooltip content={t('workspace.saveVersionDesc')} position="top">
              <Button
                theme="light"
                type="primary"
                onClick={() => {
                  setWorkflowCode(meta.workflowCode || '');
                  setSaveVisible(true);
                }}
                icon={<IconSave />}
                style={{ borderRadius: 9 }}
              >
                {t('workspace.saveVersion')}
              </Button>
            </Tooltip>
          </div>
        </>
      )}

      <Modal
        title={t('workspace.saveVersion')}
        visible={saveVisible}
        onCancel={() => setSaveVisible(false)}
        onOk={handleSave}
        okButtonProps={{ loading: saving }}
        okText={t('workspace.saveVersion')}
        cancelText={t('Cancel')}
      >
        <div style={{ fontSize: 12, color: CHAT.textMuted, marginBottom: 12 }}>
          {t('workspace.saveVersionDesc')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: CHAT.textSub }}>
              {t('workspace.workflowCode')}
            </div>
            <Input value={workflowCode} onChange={setWorkflowCode} placeholder="e.g. sentiment-analysis" />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: CHAT.textSub }}>
              {t('workspace.versionDesc')}
            </div>
            <Input value={versionDesc} onChange={setVersionDesc} />
          </div>
          <div style={{ fontSize: 11, color: CHAT.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconCode size="small" />
            {t('workspace.stats', { nodes: stats.nodeCount, edges: stats.edgeCount })}
          </div>
        </div>
      </Modal>
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: CHAT.textMuted,
      letterSpacing: '0.05em',
      marginBottom: 8,
      marginTop: 4,
    }}
  >
    {children}
  </div>
);

export default ArtifactPanel;
