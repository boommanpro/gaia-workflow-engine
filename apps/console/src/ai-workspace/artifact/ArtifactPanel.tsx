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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Input, Modal, Toast, Tooltip } from '@douyinfe/semi-ui';
import {
  IconAlertTriangle,
  IconCode,
  IconCopy,
  IconExternalOpen,
  IconSave,
  IconTickCircle,
} from '@douyinfe/semi-icons';

import { useWorkflowDocumentState, workflowDocumentStore } from '../../document';
import { t } from '../../i18n';
import { workflowApi, type GaiaWorkflow } from '../../services/workflow-api';
import { useAgent } from '../../agent/AgentContext';
import { useArtifactState } from '../../agent/artifact-store';
import type { AgentArtifactDto } from '../../agent/types';
import { agentApi } from '../../agent/api';
import { pushCanvasDraftToSession } from '../../agent/canvas-draft-sync';
import { bindSessionToWorkflow } from '../session-scope';
import { openEditorWithDraft } from '../openEditorWithDraft';
import { CHAT } from '../../chat/theme';
import { IconPanelRight } from '../../components/app-shell/icons';
import { ReadonlyCanvas } from './ReadonlyCanvas';

export const ArtifactPanel: React.FC<{ onCollapse?: () => void }> = ({ onCollapse }) => {
  const { doc, meta, revision } = useWorkflowDocumentState();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentSessionKey, sessions, streaming } = useAgent();
  const artifactState = useArtifactState();

  const [saveVisible, setSaveVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workflowCode, setWorkflowCode] = useState('');
  const [versionDesc, setVersionDesc] = useState('AI 生成');
  /** 落版目标：''=新建工作流，否则为所选已有工作流编码（对其新增版本） */
  const [saveTarget, setSaveTarget] = useState('');
  const [workflows, setWorkflows] = useState<GaiaWorkflow[]>([]);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [recordDetail, setRecordDetail] = useState<AgentArtifactDto | null>(null);

  // dsl 按 doc 变化重建（toJSON 不便宜，别跟着无关渲染每次重算）
  const dsl = useMemo(() => doc.toJSON(), [doc]);
  const isEmpty = doc.isEmpty;

  // 流式期间的画布刷新节流：document 事件高频到达，逐次 remount 整只 flowgram
  // 编辑器会打挂主线程（实测「页面无响应」的元凶）。3 秒采样一次最新画布 ——
  // 预览保持准实时、remount 成本有界；流式结束立即收敛到最终版
  const dslRef = useRef(dsl);
  dslRef.current = dsl;
  const revisionRef = useRef(revision);
  revisionRef.current = revision;
  const [liveSample, setLiveSample] = useState<{ dsl: any; rev: number } | null>(null);
  useEffect(() => {
    if (!streaming) {
      setLiveSample(null);
      return;
    }
    const timer = setInterval(() => {
      setLiveSample({ dsl: dslRef.current, rev: revisionRef.current });
    }, 3000);
    return () => clearInterval(timer);
  }, [streaming]);
  const canvasDsl = liveSample ? liveSample.dsl : dsl;
  const canvasKey = liveSample ? `canvas-live-${liveSample.rev}` : `canvas-${revision}`;

  /** 会话产物记录：试运行 / 发布 / 计划（workflow 即当前画布，不进列表） */
  const records = useMemo(() => {
    const list = artifactState.bySession[currentSessionKey || ''] || [];
    return [...list].filter((a) => a.type !== 'workflow').reverse();
  }, [artifactState, currentSessionKey]);

  /** 打开落版弹窗：默认选中草稿绑定的已有工作流（对其新增版本），否则新建 */
  const openSaveModal = useCallback(() => {
    setWorkflowCode(meta.workflowCode || '');
    setVersionDesc('AI 生成');
    setSaveTarget(meta.workflowCode || '');
    setSaveVisible(true);
    if (workflows.length === 0) {
      workflowApi.listWorkflows()
        .then((list) => setWorkflows(list || []))
        .catch(() => { /* 选择器退化成「新建」，保存仍可用 */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.workflowCode, workflows.length]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // 落版目标：所选已有工作流（新增版本）或新建编码（留空 = 草稿绑定的编码）
      const targetCode = saveTarget || workflowCode.trim();
      if (currentSessionKey) {
        // 保存前对齐（阶段 1.1）：把「眼前的画布」推成服务端权威草稿再落版 ——
        // 回滚 / 编辑器手改可能让本地领先于服务端，不对齐就会出现「保存的内容
        // 和画布所见不一致」。同步失败则明确阻断，不产生错误的版本。
        const sync = await pushCanvasDraftToSession(currentSessionKey, {
          workflowCode: targetCode || undefined,
          source: 'pre-save',
        });
        if (!sync.ok) {
          throw new Error(`${t('chat.rollbackSyncFailed')}${sync.error || ''}`);
        }
        // 会话场景：服务端会话草稿是权威数据，走专用端点落版并收口草稿绑定/CAS 基准。
        // 保存到已有工作流时不传 name —— 避免把别人的工作流顺带改名。
        const res = await agentApi.saveDraftAsVersion(currentSessionKey, {
          workflowCode: targetCode || undefined,
          name: saveTarget ? undefined : meta.workflowName || workflowCode.trim() || undefined,
          versionDesc,
        });
        if (!res.success) {
          throw new Error(res.error || 'save failed');
        }
        if (res.workflowCode) {
          workflowDocumentStore.markSaved({ workflowCode: res.workflowCode, workflowName: meta.workflowName });
          workflowDocumentStore.setMeta({ workflowCode: res.workflowCode });
          // 会话↔工作流绑定跟随落版目标（编辑器返回/手改同步的反查依据）
          bindSessionToWorkflow(currentSessionKey, res.workflowCode);
        }
        Toast.success(res.message || t('workspace.saveSuccess'));
      } else {
        // 编辑器独立打开（无会话）：直接落当前画布。
        // apply 校验拒绝时返回 HTTP 200 + success:false —— 必须检查响应体，否则
        // 又是「没存进去却提示已保存」（阶段 1.2）
        if (!targetCode) {
          Toast.warning(t('workspace.needCode'));
          return;
        }
        const applyRes = await workflowApi.applyDsl(targetCode, dsl, {
          workflowName: meta.workflowName || targetCode,
          versionDesc,
          createIfMissing: true,
        });
        const applyBody = (applyRes || {}) as { success?: boolean; error?: string };
        if (applyBody.success === false) {
          throw new Error(applyBody.error || 'workflow validation rejected');
        }
        workflowDocumentStore.markSaved({ workflowCode: targetCode, savedDsl: dsl });
        workflowDocumentStore.setMeta({ workflowCode: targetCode });
        Toast.success(t('workspace.saveSuccess'));
      }
      setSaveVisible(false);
    } catch (error) {
      Toast.error(`${t('workspace.saveFailed')}: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [currentSessionKey, dsl, meta.workflowName, versionDesc, workflowCode, saveTarget]);

  const handleRefine = useCallback(() => {
    // 同标签页跳转，而不是新开一个标签：
    // workflowDocumentStore 是模块级单例，同标签页里 AI 刚生成的那份 DSL 原样承接，
    // 对话会话也不会断（AgentContext 全局）。带 state.from 让编辑器「返回」回到本会话。
    openEditorWithDraft({
      dsl,
      workflowCode: meta.workflowCode,
      navigate,
      from: location.pathname,
      sessionKey: currentSessionKey,
    });
  }, [dsl, meta.workflowCode, navigate, location.pathname, currentSessionKey]);

  /**
   * 换新会话继续（产运多版本迭代）：新建会话并把当前草稿原样推过去（pushDraft），
   * 不走 seedDraft——后者只带工作流已落版的版本，会丢掉本会话未保存的草稿修改。
   * 新会话归入与当前会话相同的项目。
   */
  const [forking, setForking] = useState(false);
  const handleForkSession = useCallback(async () => {
    if (!currentSessionKey || forking) return;
    const cur = sessions.find((s) => s.sessionKey === currentSessionKey);
    setForking(true);
    try {
      const next = await agentApi.createSession(
        meta.workflowCode ? `迭代 ${meta.workflowName || meta.workflowCode}` : undefined,
        cur?.folderId != null ? { scope: 'work', folderId: cur.folderId } : { scope: 'chat' },
      );
      await agentApi.pushDraft(next.sessionKey, {
        dsl,
        workflowCode: meta.workflowCode || undefined,
      });
      if (meta.workflowCode) bindSessionToWorkflow(next.sessionKey, meta.workflowCode);
      Toast.success(t('workspace.forkSuccess'));
      navigate(`/chat/${next.sessionKey}`);
    } catch (err) {
      Toast.error(t('workspace.forkFailed') + (err as Error).message);
    } finally {
      setForking(false);
    }
  }, [currentSessionKey, forking, sessions, dsl, meta.workflowCode, meta.workflowName, navigate]);

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
      {/* 头部：标题 + 收起（校验提示 / DSL 查看复制下载已按需求移除） */}
      <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${CHAT.lineSoft}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: CHAT.text, flexShrink: 0 }}>
            {t('workspace.artifact')}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, flexShrink: 0 }}>
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

        {/* 状态条已按需求移除（节点/连线统计、未保存标记、版本切换器）：
            会话底部的画布与状态不再展示，画布查看/精修走「在编辑器中精修」 */}
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
          {/* 主位：实时预览画布。flowgram 内部是 absolute 定位层，容器必须自带
              relative + overflow hidden，否则画布会逃逸占满整个视口。
              key 变化 = remount 重载（flowgram 只在初始化时消费 initialData）。
              流式期间走 3 秒节流采样（canvasDsl/canvasKey，见组件头部）：
              document 事件每个节点变更都到，逐次 remount 会连环重挂打挂主线程，
              节流后预览准实时、成本有界；流式一结束立即收敛到最终版 */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
            <ReadonlyCanvas key={canvasKey} dsl={canvasDsl} />
            {streaming && (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'var(--g-bg-raised, #fff)',
                  border: `1px solid ${CHAT.accentBorder}`,
                  color: CHAT.textSub,
                  fontSize: 10.5,
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: CHAT.accent,
                    animation: 'chat-typing 1.2s infinite ease-in-out',
                    display: 'inline-block',
                  }}
                />
                {t('chat.buildingCanvas')}…
              </div>
            )}
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

          {/* 主操作：先「打开」，落版是次要动作；「换新会话继续」服务多版本迭代 */}
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
            <Tooltip content={t('workspace.forkSessionDesc')} position="top">
              <Button
                theme="light"
                type="primary"
                loading={forking}
                onClick={() => void handleForkSession()}
                icon={<IconCopy />}
                style={{ borderRadius: 9 }}
              >
                {t('workspace.forkSession')}
              </Button>
            </Tooltip>
            <Tooltip content={t('workspace.saveVersionDesc')} position="top">
              <Button
                theme="light"
                type="primary"
                onClick={openSaveModal}
                icon={<IconSave />}
                aria-label={t('workspace.saveVersion')}
                style={{ borderRadius: 9 }}
              />
            </Tooltip>
          </div>
        </>
      )}

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

      {/* 落版弹窗：可另存为已有工作流（对其新增版本）或新建编码 */}
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
              {t('workspace.saveTarget')}
            </div>
            <select
              value={saveTarget}
              onChange={(e) => setSaveTarget(e.target.value)}
              style={{
                width: '100%',
                height: 32,
                padding: '0 10px',
                background: 'var(--g-bg-sunken)',
                border: `1px solid ${CHAT.line}`,
                borderRadius: 6,
                fontSize: 13,
                color: CHAT.text,
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            >
              <option value="">{t('workspace.saveAsNew')}</option>
              {workflows.map((w) => (
                <option key={w.workflowCode} value={w.workflowCode}>
                  {w.workflowName}（{w.workflowCode}）
                </option>
              ))}
            </select>
          </div>
          {!saveTarget && (
            <div>
              <div style={{ fontSize: 12, marginBottom: 4, color: CHAT.textSub }}>
                {t('workspace.workflowCode')}
              </div>
              <Input value={workflowCode} onChange={setWorkflowCode} placeholder="e.g. sentiment-analysis" />
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: CHAT.textSub }}>
              {t('workspace.versionDesc')}
            </div>
            <Input value={versionDesc} onChange={setVersionDesc} />
          </div>
          <div style={{ fontSize: 11, color: CHAT.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconCode size="small" />
            {t('workspace.stats', { nodes: dsl.nodes.length, edges: (dsl.edges || []).length })}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ArtifactPanel;
