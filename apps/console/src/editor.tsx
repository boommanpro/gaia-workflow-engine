/**
 * Gaia Workflow Editor & Viewer
 * Based on flowgram.ai free-layout editor
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  EditorRenderer,
  FreeLayoutEditorProvider,
  useClientContext,
} from '@flowgram.ai/free-layout-editor';
import { Button as SemiButton, Modal, Input } from '@douyinfe/semi-ui';
import { IconChevronDown, IconHistory } from '@douyinfe/semi-icons';

import '@flowgram.ai/free-layout-editor/index.css';
import './index.css';
import './styles/index.css';
import { nodeRegistries } from './nodes';
import { initialData } from './initial-data';
import { useEditorProps } from './hooks';
import { DemoTools } from './components/tools';
import { workflowApi, GaiaWorkflowVersion, GaiaWorkflowTemplate, GaiaApiMeta } from './services/workflow-api';
import { getApiBaseUrl } from './utils/apiConfig';
import { useLanguage, t } from './i18n';
import { LanguageToggle } from './components/language-toggle';
import { EditorCanvasBridge } from './agent';
import { WorkflowDocument, workflowDocumentStore, useWorkflowDocumentState } from './document';
import { WorkspaceToolExecutor } from './ai-workspace/WorkspaceToolExecutor';
import { useWorkflowArtifactSync } from './ai-workspace/artifact/useWorkflowArtifactSync';
import { CopilotSidebar } from './ai-workspace/components/CopilotSidebar';
import { CanvasHistoryPopover } from './ai-workspace/components/CanvasHistoryPopover';

const ACCENT = '#4d53e8';

/**
 * 空工作流的默认数据：包含 Start → End 节点链路
 * Defense 3: 默认提供 Start/End 唯一节点，确保工作流始终有合法的起止节点
 */
const emptyWorkflowData = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: { position: { x: 200, y: 200 } },
      data: {
        title: 'Start',
        outputs: { type: 'object', properties: {} },
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: { position: { x: 500, y: 200 } },
      data: {
        title: 'End',
        inputsValues: {},
        inputs: { type: 'object', properties: {} },
      },
    },
  ],
  edges: [
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'end_0',
    },
  ],
};

/**
 * AI 工作区产物「精修」的临时编码：
 * 未落版的产物通过 sessionStorage 交接给编辑器，代码本身不是真实工作流编码。
 */
const DRAFT_CODE = '__draft__';

/** 读取 AI 工作区交接过来的草稿 DSL（刷新页面时的兜底，正常走 store） */
function readDraftDsl(): any {
  try {
    const raw = sessionStorage.getItem('gaia.artifactDraft');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.nodes?.length ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 从 headless store 里「承接」产物。
 *
 * store 是模块级单例，从通用模式用同标签页跳过来时它还握着刚生成/刚精修的那份 DSL，
 * 所以这里能直接命中 —— 这就是「从主页面跳转到工作流，数据整体承接」的实现点。
 * 带 workflowCode 时必须匹配，避免把 A 工作流的图渲染到 B 上。
 */
function readCarriedDsl(workflowCode?: string): any | null {
  try {
    const { doc, meta } = workflowDocumentStore.getSnapshot();
    if (doc.isEmpty) return null;
    if (
      workflowCode &&
      workflowCode !== DRAFT_CODE &&
      meta.workflowCode &&
      meta.workflowCode !== workflowCode
    ) {
      return null;
    }
    return doc.toJSON();
  } catch {
    return null;
  }
}

/** 首屏数据：内存承接优先，其次草稿，最后给个空壳 */
function resolveInitialData(workflowCode?: string): any {
  const carried = readCarriedDsl(workflowCode);
  if (carried) return carried;
  if (workflowCode === DRAFT_CODE) return readDraftDsl() ?? initialData;
  return workflowCode ? emptyWorkflowData : initialData;
}

// Editor component that loads workflow data from backend when workflowCode is provided
export const Editor = () => {
  const { workflowCode } = useParams<{ workflowCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  useLanguage();
  // 专家模式同样要接住「AI 在对话里产出的工作流」——不接的话，侧边栏说改了、画布却没动。
  useWorkflowArtifactSync();
  const [workflowData, setWorkflowData] = useState<any>(() => resolveInitialData(workflowCode));
  // 内存里已有承接数据就不必再 loading，避免画布闪一下
  const [loading, setLoading] = useState(
    () => !!workflowCode && workflowCode !== DRAFT_CODE && !readCarriedDsl(workflowCode)
  );
  const [workflowInfo, setWorkflowInfo] = useState<any>(null);
  const [versions, setVersions] = useState<GaiaWorkflowVersion[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<number | undefined>();
  const [remountKey, setRemountKey] = useState(0);
  // 记录已经处理过的 code，避免同一路由下重复拉取
  const handledCodeRef = useRef<string | undefined>(undefined);

  const loadVersions = useCallback(async (code: string) => {
    try {
      const vList = await workflowApi.listVersions(code);
      setVersions(vList || []);
      const current = vList?.find((v: any) => v.isCurrent === 1);
      if (current) {
        setCurrentVersionId(current.id);
      }
    } catch { /* ignore */ }
  }, []);

  /** 把一份 DSL 写回 headless store，让 AI 侧边栏 / 产物面板共享同一份事实源 */
  const adoptIntoStore = useCallback((raw: any, code?: string, name?: string) => {
    try {
      const doc = WorkflowDocument.fromJSON(raw);
      if (doc.isEmpty) return;
      const prevCode = workflowDocumentStore.getSnapshot().meta.workflowCode;
      const nextCode = code && code !== DRAFT_CODE ? code : undefined;
      // 换了一份工作流 → 上一份的版本历史不该跟过来，否则时间线会串成两件事
      if (nextCode && prevCode && prevCode !== nextCode) {
        workflowDocumentStore.clear();
      }
      workflowDocumentStore.replace(doc, { kind: 'replace', source: 'system', reason: 'import' });
      workflowDocumentStore.markSaved({
        ...(nextCode ? { workflowCode: nextCode } : {}),
        ...(name ? { workflowName: name } : {}),
      });
      if (name) workflowDocumentStore.setMeta({ workflowName: name });
    } catch { /* 忽略无法序列化的数据 */ }
  }, []);

  useEffect(() => {
    // 同一 code 只处理一次；路由参数变化时重新走一遍
    const firstRun = handledCodeRef.current === undefined;
    if (handledCodeRef.current === workflowCode) return;
    handledCodeRef.current = workflowCode;

    // —— 1) 内存承接：AI 刚产出 / 刚精修过的产物还在 store 里，直接用 ——
    const carried = readCarriedDsl(workflowCode);
    if (carried) {
      setWorkflowData(carried);
      setLoading(false);
      const meta = workflowDocumentStore.getSnapshot().meta;
      if (meta.workflowCode && meta.workflowCode !== DRAFT_CODE) {
        setWorkflowInfo((prev: any) => prev || { workflowCode: meta.workflowCode, workflowName: meta.workflowName });
        void loadVersions(meta.workflowCode);
      }
      if (!firstRun) setRemountKey((k) => k + 1);
      return;
    }

    // —— 2) 草稿模式：store 没有就看交接过来的草稿 ——
    if (workflowCode === DRAFT_CODE) {
      setWorkflowData(readDraftDsl() ?? initialData);
      setLoading(false);
      if (!firstRun) setRemountKey((k) => k + 1);
      return;
    }

    // —— 3) 都没有：回后端加载，并把结果写回 store ——
    if (!workflowCode) {
      setWorkflowData(initialData);
      setLoading(false);
      if (!firstRun) setRemountKey((k) => k + 1);
      return;
    }

    setLoading(true);
    workflowApi.getWorkflowByCode(workflowCode).then(async (workflow) => {
      if (!workflow) {
        setLoading(false);
        return;
      }
      setWorkflowInfo(workflow);

      let versionData: any = null;

      if (workflow.currentVersionId) {
        try {
          const version = await workflowApi.getVersionById(workflow.currentVersionId);
          if (version && version.workflowData) {
            versionData = version;
          }
        } catch { /* ignore */ }
      }

      if (!versionData) {
        try {
          const versions = await workflowApi.listVersions(workflowCode);
          if (versions && versions.length > 0) {
            versionData = versions.find((v: any) => v.isCurrent === 1) || versions[0];
          }
        } catch { /* ignore */ }
      }

      let nextData: any = emptyWorkflowData;
      if (versionData && versionData.workflowData) {
        try {
          nextData = typeof versionData.workflowData === 'string'
            ? JSON.parse(versionData.workflowData)
            : versionData.workflowData;
          setCurrentVersionId(versionData.id);
        } catch {
          nextData = emptyWorkflowData;
        }
      }

      setWorkflowData(nextData);
      // 承接的最后一环：回写 store，AI 侧边栏从此刻起就活在这份数据上
      adoptIntoStore(nextData, workflowCode, workflow.workflowName);
      setLoading(false);
      if (!firstRun) setRemountKey((k) => k + 1);

      // Load version list
      loadVersions(workflowCode);
    }).catch(() => setLoading(false));
  }, [workflowCode, loadVersions, adoptIntoStore]);

  const handleSwitchVersion = useCallback(async (versionId: number) => {
    try {
      const version = await workflowApi.getVersionById(versionId);
      if (version && version.workflowData) {
        const parsed = typeof version.workflowData === 'string'
          ? JSON.parse(version.workflowData)
          : version.workflowData;
        setWorkflowData(parsed);
        setCurrentVersionId(versionId);
        adoptIntoStore(parsed, workflowCode, workflowInfo?.workflowName);
        setRemountKey(k => k + 1); // Force remount to reload editor
      }
    } catch (error) {
      console.error('Failed to switch version:', error);
    }
  }, [workflowCode, workflowInfo, adoptIntoStore]);

  const editorProps = useEditorProps(workflowData, nodeRegistries);
  const { snapshots } = useWorkflowDocumentState();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>{t('editor.loadingWorkflow')}</div>
      </div>
    );
  }

  // 草稿模式若已被 AI 落版，就用真实编码去操作版本，避免进了专家模式却存不下来
  const storeCode = workflowDocumentStore.getSnapshot().meta.workflowCode;
  const effectiveCode =
    workflowCode === DRAFT_CODE ? storeCode || undefined : workflowCode;

  // 返回目标：从 AI 工作区跳过来的回工作区，否则回工作流库
  const backTo = (location.state as any)?.from === '/admin/workflows' ? '/admin/workflows' : '/';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* 左：画布工作台（专家模式主位） */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <FreeLayoutEditorProvider {...editorProps} key={remountKey}>
          <EditorCanvasBridge />
          {/* 专家模式同样不渲染 AgentDock，需要自己挂工具执行器 */}
          <WorkspaceToolExecutor />
          <EditorHeader
            workflowCode={effectiveCode}
            workflowName={workflowInfo ? workflowInfo.workflowName : t('editor.newWorkflow')}
            onBack={() => navigate(backTo)}
            versions={versions}
            currentVersionId={currentVersionId}
            onSwitchVersion={handleSwitchVersion}
            onVersionsChanged={() => effectiveCode && loadVersions(effectiveCode)}
            hasHistory={snapshots.length > 0 || versions.length > 0}
          />
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div className="demo-container" style={{ width: '100%', height: '100%' }}>
              <EditorRenderer className="demo-editor" />
            </div>
            <DemoTools hideSave />
          </div>
        </FreeLayoutEditorProvider>
      </div>

      {/* 右：AI 协作者。同一个会话、同一份 DSL，只是换了个形态 */}
      <CopilotSidebar workflowName={workflowInfo?.workflowName} workflowCode={effectiveCode} />
    </div>
  );
};

/**
 * 工作流画布预览组件。
 *
 * @param minimal 极简模式：只读 + 不渲染工具栏。用于列表卡片里的缩略预览，
 *                避免卡片里出现缩放/撤销等「编辑器才有意义」的控件。
 */
export const WorkflowViewer = ({
  data,
  height = 480,
  minimal = false,
}: {
  data: any;
  height?: number | string;
  minimal?: boolean;
}) => {
  // readonly：minimal 时禁止拖拽/新增节点；否则允许拖拽与新增（首页嵌入场景）
  const editorProps = useEditorProps(data || initialData, nodeRegistries, minimal);

  return (
    <FreeLayoutEditorProvider {...editorProps}>
      <div style={{
        height: typeof height === 'number' ? `${height}px` : height,
        position: 'relative',
        overflow: 'hidden',
        background: '#fff',
      }}>
        <EditorRenderer className="demo-editor" />
        {/* 可新增节点等工具，但隐藏 Save 与 Test Run（不可运行） */}
        {!minimal && <DemoTools hideSaveAndTestRun hideSave hideRunHistory hideReportEditor />}
      </div>
    </FreeLayoutEditorProvider>
  );
};

// Header with back button, version selector, and save button
// Transparent white minimalist style
const EditorHeader = ({
  workflowCode,
  workflowName,
  onBack,
  versions,
  currentVersionId,
  onSwitchVersion,
  onVersionsChanged,
  hasHistory,
}: {
  workflowCode?: string;
  workflowName: string;
  onBack: () => void;
  versions: GaiaWorkflowVersion[];
  currentVersionId?: number;
  onSwitchVersion: (versionId: number) => void;
  onVersionsChanged: () => void;
  /** 有会话内快照或落版版本时，头部才出现历史入口 */
  hasHistory: boolean;
}) => {
  const ctx = useClientContext();
  useLanguage();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [apiName, setApiName] = useState('');
  const [apiDesc, setApiDesc] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishedMeta, setPublishedMeta] = useState<GaiaApiMeta | null>(null);

  const currentVersion = versions.find(v => v.id === currentVersionId);

  const handleSave = async () => {
    if (!ctx?.document) return;
    setSaving(true);
    try {
      const jsonData = ctx.document.toJSON();
      const dataStr = JSON.stringify(jsonData);

      if (workflowCode) {
        const allVersions = await workflowApi.listVersions(workflowCode);
        const versionCount = allVersions ? allVersions.length : 0;
        const newVersionNumber = `v1.${versionCount}`;

        await workflowApi.createVersion({
          workflowCode,
          versionNumber: newVersionNumber,
          versionDesc: `Version ${newVersionNumber}`,
          workflowData: dataStr,
          createdBy: 'user',
        });

        // 首次保存（无历史版本）时自动设为生效版本；后续保存不改变生效版本
        if (versionCount === 0) {
          const newVersions = await workflowApi.listVersions(workflowCode);
          if (newVersions && newVersions.length > 0) {
            const newest = newVersions[0];
            await workflowApi.setCurrentVersion(newest.id!);
          }
        }

        onVersionsChanged();
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Save failed:', error);
      alert(t('editor.saveFailed') + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!workflowCode) return;
    setPublishing(true);
    try {
      const meta = await workflowApi.publishApi(workflowCode, apiName, apiDesc);
      setPublishedMeta(meta);
    } catch (e) {
      alert(t('apiDocs.publish') + ' ' + (e as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  // 设为生效版本 / 切换查看版本都收进了历史面板，头部不再自己实现一遍

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      height: '52px',
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #e8e8ea',
      flexShrink: 0,
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: '1px solid #e0e0e6',
            color: '#333',
            padding: '5px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f7'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {t('editor.back')}
        </button>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>{workflowName}</span>
        {/* 形态标识：这里是「专家模式」，与首页的通用模式区分开 */}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            color: ACCENT,
            background: '#f0f0ff',
            borderRadius: '4px',
            padding: '2px 6px',
          }}
        >
          {t('workspace.modeExpert')}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* 版本 / 历史：整页唯一入口。会话内快照与落版版本放在同一处，
            不然「撤销 AI 这一轮」和「切到 v1.1」两个动作会散在两个控件里。 */}
        {hasHistory && (
          <CanvasHistoryPopover
            workflowCode={workflowCode}
            onViewVersion={onSwitchVersion}
            onVersionsChanged={onVersionsChanged}
            {...(currentVersionId !== undefined ? { viewingVersionId: currentVersionId } : {})}
          >
            <SemiButton
              theme="borderless"
              icon={<IconHistory />}
              style={{ fontSize: '13px', color: '#555', height: '32px' }}
            >
              {(() => {
                const effective = versions.find((v) => v.isCurrent === 1);
                if (!effective) return currentVersion ? currentVersion.versionNumber : t('editor.version');
                if (currentVersion && currentVersion.id !== effective.id) {
                  return `${effective.versionNumber} / ${currentVersion.versionNumber}`;
                }
                return effective.versionNumber;
              })()}
              <IconChevronDown size="small" style={{ marginLeft: '4px' }} />
            </SemiButton>
          </CanvasHistoryPopover>
        )}

        <LanguageToggle />

        {/* 发布为 API */}
        {workflowCode && (
          <button
            onClick={() => {
              setApiName(workflowName || workflowCode);
              setApiDesc('');
              setPublishedMeta(null);
              setPublishOpen(true);
            }}
            style={{
              background: 'transparent',
              border: `1px solid ${ACCENT}`,
              color: ACCENT,
              padding: '7px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {t('apiDocs.publish')}
          </button>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? '#c5c5e8' : ACCENT,
            border: 'none',
            color: '#fff',
            padding: '7px 22px',
            borderRadius: '6px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'background 0.15s',
          }}
        >
          {saving ? t('Saving') : saved ? `✓ ${t('Saved')}` : t('Save')}
        </button>
      </div>

      {/* 发布为 API 弹窗 */}
      <Modal
        title={t('apiDocs.publish')}
        visible={publishOpen}
        onCancel={() => setPublishOpen(false)}
        footer={
          publishedMeta ? (
            <SemiButton theme="solid" style={{ background: ACCENT }} onClick={() => setPublishOpen(false)}>
              {t('Saved')}
            </SemiButton>
          ) : (
            <SemiButton theme="solid" style={{ background: ACCENT }} loading={publishing} onClick={handlePublish}>
              {t('apiDocs.publish')}
            </SemiButton>
          )
        }
      >
        {publishedMeta ? (
          <div style={{ fontSize: 13, color: '#444', lineHeight: 1.8 }}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: '#888', marginBottom: 4 }}>{t('apiDocs.endpoint')}</div>
              <code style={{ display: 'block', background: '#f6f6fb', borderRadius: 8, padding: '8px 10px', color: ACCENT, wordBreak: 'break-all' }}>
                POST {getApiBaseUrl().replace(/\/+$/, '')}/v1/wf/{publishedMeta.workflowCode}
              </code>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: '#888', marginBottom: 4 }}>{t('apiDocs.apiKey')}</div>
              <code style={{ display: 'block', background: '#fffaf0', borderRadius: 8, padding: '8px 10px', color: '#b76e00', wordBreak: 'break-all' }}>
                {publishedMeta.apiKey}
              </code>
              <div style={{ marginTop: 4, fontSize: 12, color: '#b76e00' }}>{t('apiDocs.showKey')}</div>
            </div>
            <a href={`/docs/${publishedMeta.workflowCode}`} style={{ color: ACCENT, fontSize: 13 }}>
              → {t('apiDocs.title')}
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{t('apiDocs.apiName')}</div>
              <Input value={apiName} onChange={(v) => setApiName(v)} placeholder={workflowName} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{t('apiDocs.apiDesc')}</div>
              <Input value={apiDesc} onChange={(v) => setApiDesc(v)} placeholder={t('apiDocs.apiDescPlaceholder')} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

/**
 * 模板编辑器 — 可视化编辑工作流模板数据
 * 加载模板 → 编辑 → 保存更新模板数据
 */
export const TemplateEditor = () => {
  const { templateCode } = useParams<{ templateCode: string }>();
  const navigate = useNavigate();
  useLanguage();
  const [templateData, setTemplateData] = useState<any>(initialData);
  const [templateInfo, setTemplateInfo] = useState<GaiaWorkflowTemplate | null>(null);
  const [loading, setLoading] = useState(!!templateCode);

  useEffect(() => {
    if (!templateCode) return;
    setLoading(true);
    workflowApi.listTemplates().then((list) => {
      const tpl = list?.find((t) => t.templateCode === templateCode);
      if (!tpl) {
        setLoading(false);
        return;
      }
      setTemplateInfo(tpl);
      if (tpl.templateData) {
        try {
          const parsed = typeof tpl.templateData === 'string'
            ? JSON.parse(tpl.templateData)
            : tpl.templateData;
          setTemplateData(parsed);
        } catch {
          setTemplateData(initialData);
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [templateCode]);

  const editorProps = useEditorProps(templateData, nodeRegistries);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>{t('editor.loadingTemplate')}</div>
      </div>
    );
  }

  return (
      <FreeLayoutEditorProvider {...editorProps}>
        <EditorCanvasBridge sync={false} />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TemplateEditorHeader
          templateInfo={templateInfo}
          onBack={() => navigate('/admin/templates')}
        />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div className="demo-container" style={{ width: '100%', height: '100%' }}>
            <EditorRenderer className="demo-editor" />
          </div>
          <DemoTools hideSave />
        </div>
      </div>
    </FreeLayoutEditorProvider>
  );
};

const TemplateEditorHeader = ({
  templateInfo,
  onBack,
}: {
  templateInfo: GaiaWorkflowTemplate | null;
  onBack: () => void;
}) => {
  const ctx = useClientContext();
  useLanguage();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!ctx?.document || !templateInfo) return;
    setSaving(true);
    try {
      const jsonData = ctx.document.toJSON();
      const dataStr = JSON.stringify(jsonData);
      await workflowApi.updateTemplate({
        id: templateInfo.id,
        templateCode: templateInfo.templateCode,
        templateName: templateInfo.templateName,
        templateDesc: templateInfo.templateDesc,
        templateData: dataStr,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Save failed:', error);
      alert(t('editor.saveFailed') + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      height: '52px',
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #e8e8ea',
      flexShrink: 0,
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: '1px solid #e0e0e6',
            color: '#333',
            padding: '5px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f7'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {t('editor.back')}
        </button>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>
          {templateInfo?.templateName || t('editor.template')}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <LanguageToggle />
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? '#c5c5e8' : ACCENT,
            border: 'none',
            color: '#fff',
            padding: '7px 22px',
            borderRadius: '6px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'background 0.15s',
          }}
        >
          {saving ? t('Saving') : saved ? `✓ ${t('Saved')}` : t('Save')}
        </button>
      </div>
    </div>
  );
};
