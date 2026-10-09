/**
 * 工作流产物面板 —— 产物化之后的「验收面」。
 *
 * 布局哲学：画布是主位（ai-native PRD「画布永不缺席」），一切信息围着画布转。
 *   · 顶部信息条：版本 / 校验（点击展开问题清单）/ 节点统计 / DSL 与导出
 *   · 主体：全高只读画布 —— 对话流里的真渲染只是缩略，全尺寸在这里
 *   · 底部：产物记录（会话的试运行 / 发布 / 计划历史）+ 主操作
 * 旧的「预览」tab 已移除：执行路径与节点构成和对话流卡片、画布重复；
 * 「DSL」tab 收进弹层，不再占一个常驻页签。
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Input, Modal, Popover, Tag, Toast, Tooltip } from '@douyinfe/semi-ui';
import {
  IconAlertTriangle,
  IconCode,
  IconCopy,
  IconDownload,
  IconExternalOpen,
  IconSave,
  IconTickCircle,
} from '@douyinfe/semi-icons';

import { useWorkflowDocumentState, workflowDocumentStore, validateDsl, WorkflowDocument } from '../../document';
import type { GaiaWorkflowVersion } from '../../services/workflow-api';
import { t } from '../../i18n';
import { workflowApi } from '../../services/workflow-api';
import { useAgent } from '../../agent/AgentContext';
import { useArtifactState } from '../../agent/artifact-store';
import type { AgentArtifactDto } from '../../agent/types';
import { CHAT } from '../../chat/theme';
import { IconPanelRight } from '../../components/app-shell/icons';
import { ReadonlyCanvas } from './ReadonlyCanvas';

export const ArtifactPanel: React.FC<{ onCollapse?: () => void }> = ({ onCollapse }) => {
  const { doc, meta, cursor, snapshots, revision } = useWorkflowDocumentState();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentSessionKey } = useAgent();
  const artifactState = useArtifactState();

  const [saveVisible, setSaveVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workflowCode, setWorkflowCode] = useState('');
  const [versionDesc, setVersionDesc] = useState('AI 生成');
  const [dslOpen, setDslOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [recordDetail, setRecordDetail] = useState<AgentArtifactDto | null>(null);

  const dsl = doc.toJSON();
  const validation = useMemo(() => validateDsl(dsl), [dsl]);
  const stats = useMemo(() => doc.toStats(), [doc]);
  const dirty = workflowDocumentStore.isDirty;
  const isEmpty = doc.isEmpty;

  // ---------- D4 版本切换器：会话版本轴 + 落版版本轴 ----------
  const [versions, setVersions] = useState<GaiaWorkflowVersion[]>([]);
  useEffect(() => {
    const code = meta.workflowCode;
    if (!code) {
      setVersions([]);
      return;
    }
    let cancelled = false;
    workflowApi.listVersions(code).then((list) => {
      if (!cancelled) setVersions(list || []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [meta.workflowCode, dirty]);

  /** 切到某会话版本：游标移动，不删历史（可随时切回） */
  const switchSessionVersion = useCallback((snapshotId: string) => {
    workflowDocumentStore.rollbackTo(snapshotId);
  }, []);

  /** 切到某落版版本查看：加载该版本 DSL 进画布，可继续迭代或另存 */
  const switchPublishedVersion = useCallback(async (versionId: number) => {
    try {
      const v = await workflowApi.getVersionById(versionId);
      if (!v?.workflowData) return;
      const parsed = typeof v.workflowData === 'string' ? JSON.parse(v.workflowData) : v.workflowData;
      workflowDocumentStore.replace(WorkflowDocument.fromJSON(parsed), {
        kind: 'replace',
        source: 'system',
        reason: 'import',
      });
      if (meta.workflowCode) {
        workflowDocumentStore.markSaved({ workflowCode: meta.workflowCode, workflowName: meta.workflowName });
      }
    } catch (error) {
      Toast.error(`${(error as Error).message}`);
    }
  }, [meta.workflowCode, meta.workflowName]);

  /** 会话产物记录：试运行 / 发布 / 计划（workflow 即当前画布，不进列表） */
  const records = useMemo(() => {
    const list = artifactState.bySession[currentSessionKey || ''] || [];
    return [...list].filter((a) => a.type !== 'workflow').reverse();
  }, [artifactState, currentSessionKey]);

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
    // 对话会话也不会断（AgentContext 全局）。带 state.from 让编辑器「返回」回到本会话。
    try {
      sessionStorage.setItem('gaia.artifactDraft', JSON.stringify(dsl));
    } catch {
      /* 忽略隐私模式下的写入失败 */
    }
    const code = meta.workflowCode?.trim();
    navigate(code ? `/editor/${encodeURIComponent(code)}` : '/editor/__draft__', {
      state: { from: location.pathname },
    });
  }, [dsl, meta.workflowCode, navigate, location.pathname]);

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

  const validationContent = (
    <div style={{ width: 250, maxHeight: 260, overflow: 'auto' }}>
      {validation.issues.length === 0 ? (
        <div style={{ fontSize: 12, color: CHAT.success, display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconTickCircle size="small" />
          {t('workspace.noIssues')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {validation.issues.map((issue, index) => (
            <div
              key={`${issue.code}-${index}`}
              style={{
                padding: '6px 9px',
                borderRadius: 8,
                fontSize: 12,
                background: issue.level === 'error' ? CHAT.dangerSoft : CHAT.warnSoft,
                color: issue.level === 'error' ? CHAT.danger : CHAT.warn,
                border: `1px solid ${issue.level === 'error' ? 'var(--g-danger-soft)' : 'var(--g-warn-soft)'}`,
              }}
            >
              {issue.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const recordIcon = (artifact: AgentArtifactDto) => {
    const failed = artifact.type === 'test_report' && /fail|error|timeout/i.test(String(artifact.payload?.status || ''));
    if (failed) return <IconAlertTriangle size="small" style={{ color: CHAT.danger }} />;
    if (artifact.type === 'release') return <IconExternalOpen size="small" style={{ color: CHAT.success }} />;
    if (artifact.type === 'plan') return <IconTickCircle size="small" style={{ color: CHAT.accent }} />;
    return <IconTickCircle size="small" style={{ color: CHAT.success }} />;
  };

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
      {/* 头部：版本 / 校验 / 统计 / 导出 */}
      <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${CHAT.lineSoft}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: CHAT.text, flexShrink: 0 }}>
            {t('workspace.artifact')}
          </span>
          {!isEmpty && (
            <Tag size="small" shape="circle" style={{ background: CHAT.bgSunken, color: CHAT.textSub, border: 'none' }}>
              {t('chat.snapshotVersion', { n: cursor + 1 })}
            </Tag>
          )}
          {!isEmpty && (
            <Popover content={validationContent} position="bottomRight" trigger="click">
              <Tag
                size="small"
                shape="circle"
                color={validation.valid ? 'green' : 'orange'}
                style={{ cursor: 'pointer' }}
              >
                {validation.valid
                  ? t('workspace.validationPassed')
                  : t('workspace.validationIssues', { count: validation.issues.length })}
              </Tag>
            </Popover>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, flexShrink: 0 }}>
            {!isEmpty && (
              <>
                <Tooltip content={t('workspace.tabDsl')} position="bottomRight">
                  <Button
                    size="small"
                    theme="borderless"
                    type="tertiary"
                    icon={<IconCode size="small" />}
                    onClick={() => setDslOpen(true)}
                    aria-label={t('workspace.tabDsl')}
                  />
                </Tooltip>
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
                  icon={<IconPanelRight size={16} />}
                  onClick={onCollapse}
                  aria-label={t('workspace.collapseArtifact')}
                />
              </Tooltip>
            )}
          </div>
        </div>

        {!isEmpty && (
          <div style={{ marginTop: 6, fontSize: 11.5, color: CHAT.textMuted, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
            {/* D4 版本切换器：会话版本（run 粒度）与落版版本两轴，点击画布即切换查看 */}
            {snapshots.length > 0 && (
              <Popover
                trigger="click"
                position="bottomLeft"
                content={
                  <div style={{ width: 260, maxHeight: 280, overflow: 'auto' }}>
                    {snapshots.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => switchSessionVersion(s.id)}
                        style={{
                          width: '100%',
                          border: 'none',
                          background: i === cursor ? 'var(--g-primary-soft, rgba(77,83,232,.1))' : 'transparent',
                          padding: '6px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: 11.5,
                          color: i === cursor ? CHAT.accent : CHAT.textSub,
                        }}
                      >
                        <span style={{ fontWeight: 600, flexShrink: 0 }}>{t('chat.snapshotVersion', { n: i + 1 })}</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.outcome === 'failed'
                            ? t('chat.snapshotFailedShort')
                            : s.source === 'ai' ? t('chat.snapshotReasonAiEdit') : t('chat.snapshotReasonUserEdit')}
                        </span>
                        <span style={{ color: CHAT.textFaint, flexShrink: 0, fontSize: 10.5 }}>
                          {new Date(s.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                    ))}
                  </div>
                }
              >
                <span
                  style={{ cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 2 }}
                  title={t('chat.historySnapshots')}
                >
                  {t('chat.historySnapshots')} v{cursor + 1}/{snapshots.length} ▾
                </span>
              </Popover>
            )}
            {meta.workflowCode && versions.length > 0 && (
              <Popover
                trigger="click"
                position="bottomLeft"
                content={
                  <div style={{ width: 240, maxHeight: 280, overflow: 'auto' }}>
                    {versions.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => v.id != null && void switchPublishedVersion(v.id)}
                        style={{
                          width: '100%',
                          border: 'none',
                          background: 'transparent',
                          padding: '6px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: 11.5,
                          color: v.isCurrent === 1 ? CHAT.accent : CHAT.textSub,
                        }}
                      >
                        <span style={{ fontWeight: 600, flexShrink: 0 }}>{v.versionNumber}</span>
                        {v.isCurrent === 1 && <span style={{ flex: 1 }}>{t('chat.snapshotCurrent')}</span>}
                      </button>
                    ))}
                  </div>
                }
              >
                <span
                  style={{ cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 2 }}
                  title={t('chat.historyVersions')}
                >
                  {t('chat.historyVersions')} ({versions.length}) ▾
                </span>
              </Popover>
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
          {/* 主位：全高只读画布。flowgram 内部是 absolute 定位层，
              容器必须自带 relative + overflow hidden，否则画布会逃逸占满整个视口。
              key=revision：flowgram 只在初始化时消费 initialData，产物变化必须 remount 重载，
              否则常驻画布会停在旧内容（数据是新的、画面是旧的）。 */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
            <ReadonlyCanvas key={`canvas-${revision}`} dsl={dsl} />
          </div>

          {/* 产物记录：会话的试运行 / 发布 / 计划历史（收起式） */}
          {records.length > 0 && (
            <div style={{ borderTop: `1px solid ${CHAT.lineSoft}`, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setRecordsOpen((v) => !v)}
                style={{
                  width: '100%',
                  border: 'none',
                  background: CHAT.bgSunken,
                  padding: '7px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  color: CHAT.textSub,
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                <span style={{ transform: recordsOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▸</span>
                {t('workspace.artifactRecords')}
                <span style={{ color: CHAT.textFaint, fontWeight: 400 }}>({records.length})</span>
              </button>
              {recordsOpen && (
                <div style={{ maxHeight: 168, overflow: 'auto' }}>
                  {records.map((a) => (
                    <button
                      key={a.artifactKey}
                      type="button"
                      onClick={() => setRecordDetail(a)}
                      style={{
                        width: '100%',
                        border: 'none',
                        borderTop: `1px solid ${CHAT.lineSoft}`,
                        background: CHAT.bg,
                        padding: '7px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ flexShrink: 0, display: 'flex' }}>{recordIcon(a)}</span>
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 12,
                          color: CHAT.text,
                        }}
                      >
                        {a.title}
                        {a.summary ? <span style={{ color: CHAT.textMuted }}> · {a.summary}</span> : null}
                      </span>
                      <span style={{ flexShrink: 0, fontSize: 10.5, color: CHAT.textFaint }}>
                        {formatTime(a.updatedAt)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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

      {/* DSL 弹层（原 DSL tab） */}
      <Modal
        title={`DSL${meta.workflowCode ? ` · ${meta.workflowCode}` : ''}`}
        visible={dslOpen}
        onCancel={() => setDslOpen(false)}
        footer={null}
        width={Math.min(760, typeof window !== 'undefined' ? window.innerWidth - 80 : 760)}
        bodyStyle={{ maxHeight: '62vh', overflow: 'auto', padding: 0 }}
      >
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
      </Modal>

      {/* 产物记录详情 */}
      <Modal
        title={recordDetail?.title || t('workspace.artifactRecords')}
        visible={!!recordDetail}
        onCancel={() => setRecordDetail(null)}
        footer={null}
        width={Math.min(640, typeof window !== 'undefined' ? window.innerWidth - 80 : 640)}
        bodyStyle={{ maxHeight: '62vh', overflow: 'auto' }}
      >
        {recordDetail && (
          <>
            {recordDetail.summary && (
              <div style={{ fontSize: 12, color: CHAT.textSub, marginBottom: 10 }}>{recordDetail.summary}</div>
            )}
            <pre
              style={{
                margin: 0,
                padding: '12px 14px',
                background: CHAT.bgSunken,
                borderRadius: 8,
                fontSize: 11,
                lineHeight: 1.65,
                color: CHAT.textSub,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                overflow: 'auto',
              }}
            >
              {JSON.stringify(recordDetail.payload ?? {}, null, 2)}
            </pre>
          </>
        )}
      </Modal>

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

export default ArtifactPanel;
