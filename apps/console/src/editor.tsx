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
import { initialData, emptyWorkflowData } from './initial-data';
import { useEditorProps } from './hooks';
import { DemoTools } from './components/tools';
import { workflowApi, GaiaWorkflowVersion, GaiaWorkflowTemplate, GaiaApiMeta } from './services/workflow-api';
import { getApiBaseUrl } from './utils/apiConfig';
import { TestCaseSheetButton } from './components/test-case-panel';
import { useLanguage, t } from './i18n';
import { LanguageToggle } from './components/language-toggle';
import { EditorCanvasBridge } from './agent';
import { pushCanvasDraftToSession } from './agent/canvas-draft-sync';
import { setRunWorkflowContext } from './plugins/runtime-plugin/runtime-service';
import { WorkflowDocument, workflowDocumentStore, useWorkflowDocumentState } from './document';
import { getSessionKeyForWorkflow } from './ai-workspace/session-scope';
import { useWorkflowArtifactSync } from './ai-workspace/artifact/useWorkflowArtifactSync';
import { CanvasHistoryPopover } from './ai-workspace/components/CanvasHistoryPopover';
import { AiPendingBanner } from './ai-workspace/components/AiPendingBanner';

const ACCENT = '#4d53e8';

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
/**
 * 从 headless store 里「承接」产物。allowCarry 决定是否允许承接：
 * 只有从 AI 工作区（/chat、/work）跳过来时才允许 —— 工作流库等入口
 * 必须展示落版版本，而不是会话里那份可能未落版的草稿。
 */
function readCarriedDsl(workflowCode?: string, allowCarry = false): any | null {
  if (!allowCarry && workflowCode !== DRAFT_CODE) return null;
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

/** 首屏数据：内存承接优先（仅 AI 工作区来源），其次草稿，最后给个空壳 */
function resolveInitialData(workflowCode?: string, cameFromWorkspace = false): any {
  const carried = readCarriedDsl(workflowCode, cameFromWorkspace);
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
  // 是否从 AI 工作区跳过来（决定是否允许承接会话草稿，见 readCarriedDsl）
  const cameFromWorkspace = typeof (location.state as any)?.from === 'string'
    && /^\/(chat|work)\//.test((location.state as any).from);
  // 双入口（草稿/正式）：从会话进入的精修是「会话草稿模式」—— 保存对象是会话草稿
  // （对话立即可见，AI 实时感知），不落正式工作流；落版只发生在会话页「保存为版本」。
  // 工作流库直达（无 from state）才是正式模式，保存 = 落正式版本。
  const draftMode = workflowCode === DRAFT_CODE || cameFromWorkspace;
  // 专家模式同样要接住「AI 在对话里产出的工作流」——不接的话，侧边栏说改了、画布却没动。
  useWorkflowArtifactSync();
  const [workflowData, setWorkflowData] = useState<any>(() => resolveInitialData(workflowCode, cameFromWorkspace));
  /** 供 store 订阅在挂载竞态时读到「当前 provider 正在用的数据」 */
  const workflowDataRef = useRef<any>(null);
  workflowDataRef.current = workflowData;
  // 内存里已有承接数据就不必再 loading，避免画布闪一下
  const [loading, setLoading] = useState(
    () => !!workflowCode && workflowCode !== DRAFT_CODE && !readCarriedDsl(workflowCode, cameFromWorkspace)
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
      // 落版加载的工作流不是「AI 产物」：必须重置 producedBy。store 是跨页面单例，
      // 若残留上次 /chat 会话的 'ai' 标记，切会话（如打开 AI 对话自动建新会话）时
      // 产物回收逻辑会误判「画布是 AI 的旧产物」而把整份正式数据清空。
      workflowDocumentStore.setMeta({ producedBy: 'import', ...(name ? { workflowName: name } : {}) });
    } catch { /* 忽略无法序列化的数据 */ }
  }, []);

  useEffect(() => {
    // 同一 code 只处理一次；路由参数变化时重新走一遍
    const firstRun = handledCodeRef.current === undefined;
    if (handledCodeRef.current === workflowCode) return;
    handledCodeRef.current = workflowCode;

    // 运行历史归档上下文（B 项）：试运行请求携带当前工作流编码
    // （会话草稿模式没有正式编码，传 null → 后端按无关联归档）
    setRunWorkflowContext(workflowCode && workflowCode !== DRAFT_CODE ? workflowCode : null);

    // —— 1) 内存承接：仅 AI 工作区来源；工作流库入口一律加载落版版本 ——
    const carried = readCarriedDsl(workflowCode, cameFromWorkspace);
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
      const draft = readDraftDsl();
      setWorkflowData(draft ?? initialData);
      // 草稿优先：store 里可能躺着同 scope 的旧会话快照（useWorkflowArtifactSync
      // 的 setScope 恢复先于本 effect 执行），不显式写回的话画布会被旧快照顶掉
      // —— 表现为「精修进来看不到 AI 刚生成的草稿」（2026-10-20 验收实证）
      if (draft) {
        try {
          const doc = WorkflowDocument.fromJSON(draft);
          if (!doc.isEmpty) {
            workflowDocumentStore.replace(doc, { kind: 'replace', source: 'system', reason: 'import' });
            workflowDocumentStore.setMeta({ producedBy: 'import' });
          }
        } catch { /* ignore */ }
      }
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
      // 始终重挂：首挂时 provider 以空 initialData 启动，而运行时 fromJSON
      // 不会触发渲染层（实体事件在 lock 期被吞），重挂是唯一可靠的首灌路径
      setRemountKey((k) => k + 1);

      // Load version list
      loadVersions(workflowCode);
    }).catch(() => setLoading(false));
  }, [workflowCode, loadVersions, adoptIntoStore]);

  // store 侧的结构变更（AI 增删节点/连线、回滚、落版加载）→ 以 store 为准重挂画布。
  // 运行时往 flowgram 塞实体不会走渲染层（实测 model 有节点而 DOM 零实体），
  // provider 以 initialData 重新挂载是本应用里唯一被验证可靠的整份刷新路径。
  // 用户在画布上的直接操作不重挂（画布自己就是渲染方，回滚除外——它由 store 发起）。
  useEffect(() => {
    const structureKeyOf = (dsl: any): string => {
      if (!dsl || !Array.isArray(dsl.nodes)) return 'empty';
      const nodes = dsl.nodes.map((n: any) => n.id).sort().join(',');
      const edges = Array.isArray(dsl.edges)
        ? dsl.edges.map((e: any) => `${e.sourceNodeID}->${e.targetNodeID}`).sort().join(',')
        : '';
      return `${nodes}|${edges}`;
    };
    let lastKey = structureKeyOf(workflowDocumentStore.getSnapshot().doc.toJSON());
    const syncFromStore = (key: string) => {
      lastKey = key;
      const dsl = workflowDocumentStore.getSnapshot().doc.toJSON();
      setWorkflowData(dsl);
      setRemountKey((k) => k + 1);
    };
    // 订阅建立时 store 可能已经先一步拿到了数据（后端加载竞态）：补一次对齐
    const currentKey = structureKeyOf(workflowDataRef.current);
    if (currentKey !== lastKey && lastKey !== 'empty') {
      syncFromStore(lastKey);
    }
    return workflowDocumentStore.subscribe(() => {
      const snap = workflowDocumentStore.getSnapshot();
      const change = snap.lastChange;
      if (change && change.source === 'user' && change.reason !== 'rollback') return;
      const nextKey = structureKeyOf(snap.doc.toJSON());
      if (nextKey === lastKey) return;
      syncFromStore(nextKey);
    });
  }, []);

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

  // 返回目标：state.from 优先（对话页 / 工作流管理页带过来的来源路径），否则回对话主页。
  // 只接受站内路径，避免把任意字符串当跳转目标。
  const stateFrom = (location.state as any)?.from;
  const backTo = typeof stateFrom === 'string' && /^\/(chat|work|admin|manage|workflows)(\/|$)/.test(stateFrom)
    ? stateFrom
    : '/chat';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* 画布工作台（专家模式主位）——对话在 /chat 页，这里不再内嵌 AI 悬浮窗 */}
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
          <EditorHeader
            workflowCode={effectiveCode}
            workflowName={workflowInfo ? workflowInfo.workflowName : t('editor.newWorkflow')}
            onBack={() => navigate(backTo)}
            versions={versions}
            currentVersionId={currentVersionId}
            onSwitchVersion={handleSwitchVersion}
            onVersionsChanged={() => effectiveCode && loadVersions(effectiveCode)}
            onCurrentVersionChange={setCurrentVersionId}
            hasHistory={snapshots.length > 0 || versions.length > 0}
            draftMode={draftMode}
          />
          {/* AI 待应用变更条（阶段 2.2）：AI 在专家模式提交的修改浮出在这里 */}
          <AiPendingBanner />
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div className="demo-container" style={{ width: '100%', height: '100%' }}>
              <EditorRenderer className="demo-editor" />
            </div>
            <DemoTools hideSave />
          </div>
        </FreeLayoutEditorProvider>
      </div>
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
  onCurrentVersionChange,
  hasHistory,
  draftMode,
}: {
  workflowCode?: string;
  workflowName: string;
  onBack: () => void;
  versions: GaiaWorkflowVersion[];
  currentVersionId?: number;
  onSwitchVersion: (versionId: number) => void;
  onVersionsChanged: () => void;
  /** 保存落版后把头部标签对齐到新版本（阶段 1.3） */
  onCurrentVersionChange?: (versionId: number) => void;
  /** 有会话内快照或落版版本时，头部才出现历史入口 */
  hasHistory: boolean;
  /** 会话草稿模式（从 /chat 精修进入）：画布编辑经自动同步推给会话，不落正式版本 */
  draftMode: boolean;
}) => {
  const ctx = useClientContext();
  useLanguage();
  // 未保存判定（阶段 1.3）：按变更来源维护的 store 标记，markSaved 时清除。
  // AI 修改、手改、回滚都会置位 —— 版本意义上它们都还没落进任何正式版本。
  // 不用「序列化对比」：首挂时 flowgram 规整序列化会产生派生字段差异，必误报。
  const { meta: headerMeta } = useWorkflowDocumentState();
  const unsaved = !draftMode && headerMeta.dirtySinceSave === true;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [codeAskOpen, setCodeAskOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  /** 首次保存失败原因（校验拒绝等）：显示在弹窗内，画布与输入都保留 */
  const [codeAskError, setCodeAskError] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [apiName, setApiName] = useState('');
  const [apiDesc, setApiDesc] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishedMeta, setPublishedMeta] = useState<GaiaApiMeta | null>(null);

  const currentVersion = versions.find(v => v.id === currentVersionId);

  /** 保存成功后的收口：基线对齐 + 已保存内容同步回会话草稿（AI 下一轮与保存结果一致） */
  const settleSaved = (code: string) => {
    workflowDocumentStore.markSaved({ workflowCode: code });
    workflowDocumentStore.setMeta({ workflowCode: code });
    void pushCanvasDraftToSession(getSessionKeyForWorkflow(code), {
      workflowCode: code,
      source: 'editor-save',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSave = async () => {
    if (!ctx?.document) return;
    // 草稿模式不再有「保存」按钮：手改自动同步（scheduleManualDraftPush）实时推会话草稿，
    // 落版只发生在会话页「保存为版本」。
    // 无编码（AI 草稿模式且未落版）：没有可寻址的版本容器 —— 明确要一个编码，
    // 不再静默显示「已保存」（阶段 1.2 的虚假成功路径）
    if (!workflowCode) {
      setNewCode('');
      setCodeAskError(null);
      setCodeAskOpen(true);
      return;
    }
    setSaving(true);
    try {
      const jsonData = ctx.document.toJSON();
      const dataStr = JSON.stringify(jsonData);

      const allVersions = await workflowApi.listVersions(workflowCode);
      const versionCount = allVersions ? allVersions.length : 0;
      // 版本号取现存最大 minor + 1：按条数编号在删除历史版本后会重号
      const maxMinor = (allVersions || []).reduce((max, v) => {
        const m = /^v\d+\.(\d+)$/.exec(v.versionNumber || '');
        return m ? Math.max(max, Number(m[1])) : max;
      }, 0);
      const newVersionNumber = `v1.${maxMinor + 1}`;

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

      // 保存后头部标签与画布内容对齐（阶段 1.3）：否则标签还停在旧版号，
      // 用户看到的却是刚保存的新内容
      const refreshed = await workflowApi.listVersions(workflowCode);
      const newestVersion = (refreshed || []).reduce<GaiaWorkflowVersion | null>((best, v) => {
        if (!best) return v;
        const no = (x: string) => Number(/^v\d+\.(\d+)$/.exec(x || '')?.[1] ?? -1);
        return no(v.versionNumber) > no(best.versionNumber) ? v : best;
      }, null);
      if (newestVersion?.id != null) onCurrentVersionChange?.(newestVersion.id);

      onVersionsChanged();
      settleSaved(workflowCode);
    } catch (error) {
      // 失败保留现场：画布与输入不动，只报错（阶段 1.2）
      console.error('Save failed:', error);
      alert(t('editor.saveFailed') + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /** 首次保存：用户给出工作流编码后经 applyDsl 建流落版（新工作流首版即生效版）。
   *  注意 apply 接口校验拒绝时返回 HTTP 200 + success:false —— 必须检查响应体，
   *  否则又是「没存进去却显示已保存」（阶段 1.2）。 */
  const handleSaveWithNewCode = async () => {
    const code = newCode.trim();
    if (!code || !ctx?.document) return;
    setSaving(true);
    setCodeAskError(null);
    try {
      const jsonData = ctx.document.toJSON();
      const res = await workflowApi.applyDsl(code, jsonData, {
        workflowName: workflowName || code,
        versionDesc: 'Initial version',
        createIfMissing: true,
      });
      const r = (res || {}) as { success?: boolean; error?: string };
      if (r.success === false) {
        // 弹窗保留 + 就地显示原因（多为节点配置缺失的长文案），现场不动
        setCodeAskError(r.error || 'workflow validation rejected');
        return;
      }
      setCodeAskOpen(false);
      settleSaved(code);
    } catch (error) {
      console.error('Save failed:', error);
      setCodeAskError((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!workflowCode) return;
    setPublishing(true);
    try {
      const meta = await workflowApi.publishApi(
        workflowCode,
        apiName,
        apiDesc,
        getSessionKeyForWorkflow(workflowCode) || undefined
      );
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
                // 阶段 1.3：标签区分「生效版 / 查看版 / 未保存」三层状态。
                // 仅一个版号 = 生效即所见；两个版号 = 生效 v旧 / 查看 v新；
                // 「未保存」标记 = 画布内容已偏离最近一次落版基线（手改/AI 改/回滚都算）。
                const effective = versions.find((v) => v.isCurrent === 1);
                if (!effective) return currentVersion ? currentVersion.versionNumber : t('editor.version');
                if (currentVersion && currentVersion.id !== effective.id) {
                  return `${t('editor.versionEffective', { v: effective.versionNumber })} / ${currentVersion.versionNumber}`;
                }
                return effective.versionNumber;
              })()}
              {unsaved && !draftMode && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#d4a017',
                    background: 'rgba(212, 160, 23, 0.12)',
                    borderRadius: 4,
                    padding: '1px 5px',
                  }}
                  title={t('editor.unsavedHint')}
                >
                  {t('editor.unsavedBadge')}
                </span>
              )}
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

        {/* 测试用例面板入口（2026-10-17 期3）：与 agent 的 test_case / run(target=tests) 同一数据面 */}
        {workflowCode && (
          <TestCaseSheetButton
            workflowCode={workflowCode}
            getCanvasJson={() => {
              try { return ctx?.document ? ctx.document.toJSON() : null; } catch { return null; }
            }}
            getNodes={() => {
              try {
                const json = ctx?.document ? ctx.document.toJSON() : { nodes: [] };
                return (json.nodes || []).map((n: any) => ({
                  id: n.id, type: n.type, title: n.data?.title || n.type,
                }));
              } catch { return []; }
            }}
          />
        )}

        {/* 草稿模式标识：画布编辑经手改自动同步（scheduleManualDraftPush）实时推给会话，
            不再放「同步到对话」按钮 —— 与自动同步重复；正式模式才需要显式「保存」落版 */}
        {draftMode && (
          <span
            style={{
              fontSize: '12px',
              color: '#5558c8',
              background: '#eef0ff',
              border: '1px solid #dcdff8',
              borderRadius: '6px',
              padding: '5px 10px',
              marginRight: 8,
            }}
          >
            {t('editor.sessionDraft')}
          </span>
        )}
        {!draftMode && (
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
            {saving
              ? t('Saving')
              : saved
                ? `✓ ${t('Saved')}`
                : t('Save')}
          </button>
        )}
      </div>

      {/* 首次保存需要工作流编码：草稿模式下没有可寻址的版本容器，明确要一个编码
          而不是静默「已保存」（阶段 1.2）。新建后经 applyDsl 落为首版（即生效版） */}
      <Modal
        title={t('editor.needCodeTitle')}
        visible={codeAskOpen}
        onCancel={() => setCodeAskOpen(false)}
        onOk={handleSaveWithNewCode}
        okButtonProps={{ loading: saving }}
        okText={t('Save')}
        cancelText={t('Cancel')}
      >
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
          {t('editor.needCodeDesc')}
        </div>
        <Input
          value={newCode}
          onChange={(v) => setNewCode(v)}
          placeholder="e.g. order-approval"
          onKeyPress={(e) => {
            if (e.key === 'Enter') void handleSaveWithNewCode();
          }}
        />
        {codeAskError && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              lineHeight: 1.6,
              color: '#e5404e',
              background: '#fdf0f0',
              borderRadius: 8,
              padding: '8px 10px',
              maxHeight: 160,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {codeAskError}
          </div>
        )}
      </Modal>

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
          // 空模板（无节点）兜底为 Start → End，避免画布空白
          setTemplateData(parsed?.nodes?.length ? parsed : emptyWorkflowData);
        } catch {
          setTemplateData(emptyWorkflowData);
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
