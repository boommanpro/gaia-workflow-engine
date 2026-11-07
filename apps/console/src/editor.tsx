/**
 * Gaia Workflow Editor & Viewer
 * Based on flowgram.ai free-layout editor
 */

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

import {
  EditorRenderer,
  FreeLayoutEditorProvider,
  useClientContext,
} from '@flowgram.ai/free-layout-editor';
import { Button as SemiButton, Modal, Input, Popconfirm, Toast } from '@douyinfe/semi-ui';
import { IconChevronDown, IconEdit, IconHistory } from '@douyinfe/semi-icons';

import '@flowgram.ai/free-layout-editor/index.css';
import './index.css';
import './styles/index.css';
import {
  workflowApi,
  GaiaWorkflowVersion,
  GaiaWorkflowTemplate,
} from './services/workflow-api';
import { setRunWorkflowContext } from './plugins/runtime-plugin/runtime-service';
import { nodeRegistries } from './nodes';
import { initialData, emptyWorkflowData } from './initial-data';
import { useLanguage, t } from './i18n';
import { useEditorProps } from './hooks';
import { applyEditorPrefsSideEffects, getEditorPrefs, useEditorPrefs } from './editor-prefs';
import {
  WorkflowDocument,
  workflowDocumentStore,
  useWorkflowDocumentState,
  applyRenderCompat,
  canvasContentKey,
  versionContentKey,
} from './document';
import { DemoTools } from './components/tools';
import { NodePaletteRail } from './components/node-palette-rail';
import { LanguageToggle } from './components/language-toggle';
import { EditorPrefsPanel } from './components/editor-prefs-panel';
import { getSessionKeyForWorkflow } from './ai-workspace/session-scope';
import { CanvasHistoryPopover } from './ai-workspace/components/CanvasHistoryPopover';
import { AiPendingBanner } from './ai-workspace/components/AiPendingBanner';
import { useWorkflowArtifactSync } from './ai-workspace/artifact/useWorkflowArtifactSync';
import {
  pushCanvasDraftToSession,
  hasUnsyncedLocalEdits,
  saveCanvasDraft,
  resolveDraftTargetSession,
} from './agent/canvas-draft-sync';
import { agentApi } from './agent/api';
import { EditorCanvasBridge } from './agent';

const ACCENT = '#4d53e8';

/**
 * AI 工作区产物「精修」的临时编码：
 * 未落版的产物通过 sessionStorage 交接给编辑器，代码本身不是真实工作流编码。
 */
const DRAFT_CODE = '__draft__';

/** 读取 AI 工作区交接过来的草稿 DSL（刷新页面时的兜底，正常走 store）；
 *  过展示层兼容归一（裸 url / token 空格 / llm required，见 document/render-compat） */
function readDraftDsl(): any {
  try {
    const raw = sessionStorage.getItem('gaia.artifactDraft');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.nodes?.length ? applyRenderCompat(parsed) : null;
  } catch {
    return null;
  }
}

/** 交接草稿归属的会话 key（openEditorWithDraft 写入；history.state 丢失时的兜底） */
function readHandoffSessionKey(): string | null {
  try {
    return sessionStorage.getItem('gaia.artifactDraftSession') || null;
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
  const cameFromWorkspace =
    typeof (location.state as any)?.from === 'string' &&
    /^\/(chat|work)\//.test((location.state as any).from);
  // 双入口（草稿/正式）：从会话进入的精修是「会话草稿模式」—— 保存对象是会话草稿
  // （对话立即可见，AI 实时感知），不落正式工作流；落版只发生在会话页「保存为版本」。
  // 工作流库直达（无 from state）才是正式模式，保存 = 落正式版本。
  const draftMode = workflowCode === DRAFT_CODE || cameFromWorkspace;
  // 专家模式同样要接住「AI 在对话里产出的工作流」——不接的话，侧边栏说改了、画布却没动。
  useWorkflowArtifactSync();
  const [workflowData, setWorkflowData] = useState<any>(() =>
    resolveInitialData(workflowCode, cameFromWorkspace)
  );
  /** 供 store 订阅在挂载竞态时读到「当前 provider 正在用的数据」 */
  const workflowDataRef = useRef<any>(null);
  workflowDataRef.current = workflowData;
  // 内存里已有承接数据就不必再 loading，避免画布闪一下
  const [loading, setLoading] = useState(
    () =>
      !!workflowCode &&
      workflowCode !== DRAFT_CODE &&
      !readCarriedDsl(workflowCode, cameFromWorkspace)
  );
  const [workflowInfo, setWorkflowInfo] = useState<any>(null);
  const [versions, setVersions] = useState<GaiaWorkflowVersion[]>([]);
  const [remountKey, setRemountKey] = useState(0);
  // 记录已经处理过的 code，避免同一路由下重复拉取
  const handledCodeRef = useRef<string | undefined>(undefined);

  const loadVersions = useCallback(async (code: string) => {
    try {
      const vList = await workflowApi.listVersions(code);
      setVersions(vList || []);
    } catch {
      /* ignore */
    }
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
        workflowDocumentStore.clear({ wipePersisted: true });
      }
      workflowDocumentStore.replace(doc, { kind: 'replace', source: 'system', reason: 'import' });
      workflowDocumentStore.markSaved({
        ...(nextCode ? { workflowCode: nextCode } : {}),
        ...(name ? { workflowName: name } : {}),
      });
      // 落版加载的工作流不是「AI 产物」：必须重置 producedBy。store 是跨页面单例，
      // 若残留上次 /chat 会话的 'ai' 标记，切会话（如打开 AI 对话自动建新会话）时
      // 产物回收逻辑会误判「画布是 AI 的旧产物」而把整份正式数据清空。
      workflowDocumentStore.setMeta({
        producedBy: 'import',
        ...(name ? { workflowName: name } : {}),
      });
    } catch {
      /* 忽略无法序列化的数据 */
    }
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
        setWorkflowInfo(
          (prev: any) =>
            prev || { workflowCode: meta.workflowCode, workflowName: meta.workflowName }
        );
        void loadVersions(meta.workflowCode);
      } else if (
        typeof (location.state as any)?.workflowName === 'string' &&
        (location.state as any).workflowName.trim()
      ) {
        // 草稿承接（未落版）：标题用跳转带来的会话标题兜底（F1，2026-10-25）
        setWorkflowInfo(
          (prev: any) => prev || { workflowName: (location.state as any).workflowName }
        );
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
            workflowDocumentStore.replace(doc, {
              kind: 'replace',
              source: 'system',
              reason: 'import',
            });
            workflowDocumentStore.setMeta({ producedBy: 'import' });
          }
        } catch {
          /* ignore */
        }
      }
      // 标题兜底：草稿未落版时 store meta 没有工作流名，用跳转带来的会话标题，
      // 否则编辑器一直显示「新建工作流」（F1，2026-10-25）
      const carriedName = (location.state as any)?.workflowName;
      const meta = workflowDocumentStore.getSnapshot().meta;
      if (!meta.workflowName && typeof carriedName === 'string' && carriedName.trim()) {
        setWorkflowInfo((prev: any) => prev || { workflowName: carriedName });
      }
      setLoading(false);

      // —— 刷新恢复（2026-10-27）：上面的交接副本只是「精修进入瞬间」的快照，
      // 之后的手改都已推到服务端会话草稿。刷新后 store 清空、副本陈旧 ——
      // 用交接的 sessionKey 拉服务端草稿顶回画布，副本降级为拉取失败时的兜底。
      const stateSession = (location.state as any)?.sessionKey;
      const handoffSession =
        typeof stateSession === 'string' && stateSession ? stateSession : readHandoffSessionKey();
      if (handoffSession && !handoffSession.startsWith('draft-')) {
        void agentApi
          .getSessionDocument(handoffSession)
          .then((doc: any) => {
            if (!doc || !Array.isArray(doc.nodes) || doc.nodes.length === 0) return;
            // 路由已换走 / 拉取期间用户已手改：本地优先，不顶掉
            if (handledCodeRef.current !== DRAFT_CODE) return;
            if (hasUnsyncedLocalEdits()) return;
            if (workflowDocumentStore.getSnapshot().meta.ownerSession === handoffSession) return;
            try {
              const restored = WorkflowDocument.fromJSON({
                nodes: doc.nodes,
                edges: doc.edges || [],
              });
              if (restored.isEmpty) return;
              workflowDocumentStore.replace(restored, {
                kind: 'replace',
                source: 'system',
                reason: 'import',
              });
              // 归属会话显式写回：手改自动同步（resolveDraftTargetSession）与切会话冲刷都靠它定位
              workflowDocumentStore.setMeta({ producedBy: 'ai', ownerSession: handoffSession });
              // 画布必须显式重挂：下方 store 订阅漏斗只认「结构键」（节点/边 id 集），
              // 刷新恢复常常只差坐标（结构同键）会被它短路——表现为刷回来还是旧位置
              setWorkflowData(restored.toJSON());
              setRemountKey((k) => k + 1);
            } catch {
              /* 服务端草稿不可解析时保留交接副本 */
            }
          })
          .catch(() => {
            /* 拉取失败：保留交接副本 */
          });
      }

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
    workflowApi
      .getWorkflowByCode(workflowCode)
      .then(async (workflow) => {
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
          } catch {
            /* ignore */
          }
        }

        if (!versionData) {
          try {
            const versions = await workflowApi.listVersions(workflowCode);
            if (versions && versions.length > 0) {
              versionData = versions.find((v: any) => v.isCurrent === 1) || versions[0];
            }
          } catch {
            /* ignore */
          }
        }

        let nextData: any = emptyWorkflowData;
        if (versionData && versionData.workflowData) {
          try {
            const raw =
              typeof versionData.workflowData === 'string'
                ? JSON.parse(versionData.workflowData)
                : versionData.workflowData;
            // 版本历史可能存有裸字符串 url / 带空格 token 的旧形状——过展示层兼容归一
            nextData = applyRenderCompat(raw);
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
      })
      .catch(() => setLoading(false));
  }, [workflowCode, loadVersions, adoptIntoStore]);

  // store 侧的结构变更（AI 增删节点/连线、回滚、落版加载）→ 以 store 为准重挂画布。
  // 运行时往 flowgram 塞实体不会走渲染层（实测 model 有节点而 DOM 零实体），
  // provider 以 initialData 重新挂载是本应用里唯一被验证可靠的整份刷新路径。
  // 用户在画布上的直接操作不重挂（画布自己就是渲染方，回滚除外——它由 store 发起）。
  // AI 连续变更（document 事件洪峰）走 1.2s 尾沿去抖：一次搭建高峰只重挂一次，
  // 而不是每个节点变更重挂一只完整编辑器（连环重挂曾是编辑器页卡死的直接来源）。
  useEffect(() => {
    const structureKeyOf = (dsl: any): string => {
      if (!dsl || !Array.isArray(dsl.nodes)) return 'empty';
      const nodes = dsl.nodes
        .map((n: any) => n.id)
        .sort()
        .join(',');
      const edges = Array.isArray(dsl.edges)
        ? dsl.edges
            .map((e: any) => `${e.sourceNodeID}->${e.targetNodeID}`)
            .sort()
            .join(',')
        : '';
      return `${nodes}|${edges}`;
    };
    let lastKey = structureKeyOf(workflowDocumentStore.getSnapshot().doc.toJSON());
    const applyNow = () => {
      // 拖拽放置进行中不做整份重挂：加载期的对齐重挂会吞掉刚从左侧面板拖入、
      // 尚未同步进 store 的节点（表现为「首次拖入一闪就消失」，2026-11-05 用户反馈）。
      // 稍后重试；拖拽结束后 store 已包含新节点，结构键相等即不再重挂。
      if ((window as unknown as { __gaiaPaletteDrag?: boolean }).__gaiaPaletteDrag) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          applyNow();
        }, 600);
        return;
      }
      const dsl = workflowDocumentStore.getSnapshot().doc.toJSON();
      lastKey = structureKeyOf(dsl);
      // store 结构与画布当前内容一致时不重挂：打开工作流时，加载回写/草稿恢复
      // 写进 store 的常是画布已有的同一份结构，重挂只会让整个编辑器无故重建一次
      // （表现为打开 1~2 秒后页面又「刷新」了一下）。数据级差异由 canvas-sync
      // 增量补丁负责，只有结构相对画布真的变了才走这里的整份重挂。
      if (structureKeyOf(workflowDataRef.current) === lastKey) return;
      setWorkflowData(dsl);
      setRemountKey((k) => k + 1);
    };
    let pendingKey: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const syncFromStore = (key: string) => {
      pendingKey = key;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (pendingKey === null) return;
        pendingKey = null;
        applyNow();
      }, 1200);
    };
    // 订阅建立时 store 可能已经先一步拿到了数据（后端加载竞态）：立即对齐一次
    const currentKey = structureKeyOf(workflowDataRef.current);
    if (currentKey !== lastKey && lastKey !== 'empty') {
      applyNow();
    }
    const unsubscribe = workflowDocumentStore.subscribe(() => {
      const snap = workflowDocumentStore.getSnapshot();
      const change = snap.lastChange;
      if (change && change.source === 'user' && change.reason !== 'rollback') return;
      const nextKey = structureKeyOf(snap.doc.toJSON());
      if (nextKey === lastKey) return;
      syncFromStore(nextKey);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // 未保存守卫：刷新/关闭页面前浏览器原生确认（保存制下未保存修改刷新即丢，
  // 必须在离开前给一次反悔机会）。实时读 store，无依赖。
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (workflowDocumentStore.getSnapshot().meta.dirtySinceSave === true) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const handleSwitchVersion = useCallback(
    async (versionId: number) => {
      try {
        const version = await workflowApi.getVersionById(versionId);
        if (version && version.workflowData) {
          const raw =
            typeof version.workflowData === 'string'
              ? JSON.parse(version.workflowData)
              : version.workflowData;
          setWorkflowData(applyRenderCompat(raw));
          adoptIntoStore(raw, workflowCode, workflowInfo?.workflowName);
          setRemountKey((k) => k + 1); // Force remount to reload editor
        }
      } catch (error) {
        console.error('Failed to switch version:', error);
      }
    },
    [workflowCode, workflowInfo, adoptIntoStore]
  );

  const prefs = useEditorPrefs();
  // 画布背景（点阵/无）是构建期插件参数：变更时并入 remount key 生效（罕见操作，可接受重建）
  const editorProps = {
    ...useEditorProps(workflowData, nodeRegistries),
    background: getEditorPrefs().canvasBg === 'dots',
  };
  const { snapshots } = useWorkflowDocumentState();

  // 全局 CSS 变量副作用（连线/端口读取 --g-workflow-*-color）
  useEffect(() => {
    applyEditorPrefsSideEffects();
  }, []);

  if (loading) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}
      >
        <div style={{ fontSize: '18px', color: '#666' }}>{t('editor.loadingWorkflow')}</div>
      </div>
    );
  }

  // 草稿模式若已被 AI 落版，就用真实编码去操作版本，避免进了专家模式却存不下来
  const storeCode = workflowDocumentStore.getSnapshot().meta.workflowCode;
  const effectiveCode = workflowCode === DRAFT_CODE ? storeCode || undefined : workflowCode;

  // 返回目标：state.from 优先（对话页 / 工作流管理页带过来的来源路径），否则回对话主页。
  // 只接受站内路径，避免把任意字符串当跳转目标。
  const stateFrom = (location.state as any)?.from;
  const backTo =
    typeof stateFrom === 'string' && /^\/(chat|work|admin|manage|workflows)(\/|$)/.test(stateFrom)
      ? stateFrom
      : '/chat';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* 画布工作台（专家模式主位）——对话在 /chat 页，这里不再内嵌 AI 悬浮窗 */}
      <div
        className={`gaia-editor-page${prefs.compact ? ' gaia-editor-compact' : ''}`}
        data-editor-theme={prefs.theme === 'auto' ? undefined : prefs.theme}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <FreeLayoutEditorProvider {...editorProps} key={`${remountKey}-${prefs.canvasBg}`}>
          <EditorCanvasBridge />
          <EditorHeader
            workflowCode={effectiveCode}
            workflowName={workflowInfo ? workflowInfo.workflowName : t('editor.newWorkflow')}
            onBack={() => navigate(backTo)}
            versions={versions}
            onSwitchVersion={handleSwitchVersion}
            onVersionsChanged={() => effectiveCode && loadVersions(effectiveCode)}
            hasHistory={snapshots.length > 0 || versions.length > 0}
            draftMode={draftMode}
          />
          {/* AI 待应用变更条（阶段 2.2）：AI 在专家模式提交的修改浮出在这里 */}
          <AiPendingBanner />
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div className="demo-container" style={{ width: '100%', height: '100%' }}>
              <EditorRenderer className="demo-editor" />
            </div>
            {prefs.addPalette && <NodePaletteRail />}
            <DemoTools hideSave testWorkflowCode={effectiveCode} />
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
      <div
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          position: 'relative',
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <EditorRenderer className="demo-editor" />
        {/* 可新增节点等工具，但隐藏 Save 与 Test Run（不可运行） */}
        {!minimal && <DemoTools hideSaveAndTestRun hideSave hideRunHistory />}
      </div>
    </FreeLayoutEditorProvider>
  );
};

/** 会话草稿模式（保存制）的头部按钮区：未保存角标 + 「保存」按钮。
 *  保存 = 把眼前画布推成会话草稿（AI 可见）；落版仍走会话页「保存为版本」，
 *  与正式模式「保存落版」的语义分层保持一致。 */
const DraftSaveControls = ({
  saving,
  saved,
  unsaved,
  onSave,
}: {
  saving: boolean;
  saved: boolean;
  unsaved: boolean;
  onSave: () => void;
}) => (
  <>
    {unsaved && (
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#d4a017',
          background: 'rgba(212, 160, 23, 0.12)',
          borderRadius: 4,
          padding: '2px 6px',
        }}
        title={t('editor.unsavedHint')}
      >
        {t('editor.unsavedBadge')}
      </span>
    )}
    <button
      onClick={onSave}
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
  </>
);

// Header with back button, version selector, and save button
// Transparent white minimalist style
const EditorHeader = ({
  workflowCode,
  workflowName,
  onBack,
  versions,
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
  // 未保存判定（阶段 1.3 + 2026-10-27 保存制）：dirtySinceSave 按变更来源维护，
  // markSaved 清除 —— 手改/AI 修改/回滚/纯布局拖动都置位，两种模式同样生效。
  // 不用「序列化对比」：首挂时 flowgram 规整序列化会产生派生字段差异，必误报。
  const { meta: headerMeta, doc: headerDoc } = useWorkflowDocumentState();
  const unsaved = headerMeta.dirtySinceSave === true;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [codeAskOpen, setCodeAskOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  /** 首次保存失败原因（校验拒绝等）：显示在弹窗内，画布与输入都保留 */
  const [codeAskError, setCodeAskError] = useState<string | null>(null);

  /** 名称就地编辑（2026-11-05 顶部栏归位）：正式模式点击标题改名，随下次发布生效 */
  const [nameEdit, setNameEdit] = useState(false);
  const [nameDraft, setNameDraft] = useState(workflowName);
  useEffect(() => {
    setNameDraft(workflowName);
  }, [workflowName]);
  const displayName = nameDraft.trim() ? nameDraft : workflowName;

  /** 生效版本（is_current=1）：线上 API 实际执行的那个 */
  const effectiveVersion = versions.find((v) => v.isCurrent === 1);

  // —— 内容键路由（2026-11-04 单身份改版）——
  // 画布内容「恰好等于哪个版本」由内容说了算，不依赖 currentVersionId 记账：
  // 预览态判定、发布路径选择（切指针 vs 生成新版本）、时间线「当前」三者共用同一基准。
  const versionKeysById = useMemo(() => {
    const map = new Map<number, string | null>();
    for (const v of versions) {
      if (v.id != null) map.set(v.id, versionContentKey(v.workflowData));
    }
    return map;
  }, [versions]);
  const canvasKey = useMemo(() => {
    try {
      // 内容键含全部字段（含节点坐标；2026-11-04 用户决策 B「完全按直觉」）：
      // 拖动节点即产生「未发布的修改」，可发布携带新坐标的新版本
      return canvasContentKey(headerDoc.toJSON());
    } catch {
      return null;
    }
  }, [headerDoc]);
  const matchedVersion = useMemo(
    () =>
      canvasKey
        ? versions.find((v) => v.id != null && versionKeysById.get(v.id) === canvasKey) || null
        : null,
    [versions, versionKeysById, canvasKey]
  );
  /** 与生效版本一致：发布按钮置灰，无事可做 */
  const inSyncWithEffective = !!effectiveVersion && matchedVersion?.id === effectiveVersion.id;
  /** 预览态：画布恰好是某个旧版本 —— 发布 = set-current 指针回拨（不产生新版本行） */
  const previewingOtherVersion = !!matchedVersion && !inSyncWithEffective;

  const [publishingEffective, setPublishingEffective] = useState(false);
  /** 发布确认弹窗（生成新版本路径）：版本说明 + AI 代拟 */
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishDesc, setPublishDesc] = useState('');
  const [publishDescLoading, setPublishDescLoading] = useState(false);
  const [publishingVersion, setPublishingVersion] = useState(false);

  /** 指针回拨路径：画布 == 某旧版本，发布即切换生效指针（Popconfirm 确认） */
  const handlePublishEffective = async () => {
    if (!matchedVersion?.id) return;
    setPublishingEffective(true);
    try {
      await workflowApi.setCurrentVersion(matchedVersion.id);
      Toast.success(t('editor.versionSetCurrent'));
      onVersionsChanged();
      onCurrentVersionChange?.(matchedVersion.id);
    } catch (error) {
      Toast.error(`${t('editor.versionSetCurrentFailed')}${(error as Error).message}`);
    } finally {
      setPublishingEffective(false);
    }
  };

  /** 发布入口：无编码 → 先要编码（applyDsl 建流，首版即生效）；有修改 → 确认弹窗 */
  const handlePublishClick = () => {
    if (!workflowCode) {
      setNewCode('');
      setCodeAskError(null);
      setCodeAskOpen(true);
      return;
    }
    setPublishDesc('');
    setPublishModalOpen(true);
    // AI 代拟版本说明（有归属会话时；锦上添花，失败留空由用户填写）
    const sessionKey = getSessionKeyForWorkflow(workflowCode);
    if (sessionKey) {
      setPublishDescLoading(true);
      agentApi
        .suggestVersionDesc(sessionKey, workflowCode)
        .then((res) => {
          if (res?.success && res.desc) {
            setPublishDesc((prev) => (prev === '' ? res.desc! : prev));
          }
        })
        .catch(() => {})
        .finally(() => setPublishDescLoading(false));
    }
  };

  /** 生成新版本路径：applyDsl 一步落版并生效（版本号后端统一编排，前端不再自行计算） */
  const handleConfirmPublish = async () => {
    if (!workflowCode || !ctx?.document) return;
    setPublishingVersion(true);
    try {
      const res = await workflowApi.applyDsl(workflowCode, ctx.document.toJSON(), {
        workflowName: displayName || workflowCode,
        versionDesc: publishDesc.trim() || t('editor.publishFromEditor'),
      });
      const r = (res || {}) as {
        success?: boolean;
        error?: string;
        versionId?: number;
        versionNumber?: string;
      };
      if (r.success === false) {
        // 弹窗与画布现场保留，就地报错（校验拒绝多为长文案）
        Toast.error(r.error || 'publish rejected');
        return;
      }
      setPublishModalOpen(false);
      Toast.success(t('editor.publishDone', { v: r.versionNumber || '' }));
      if (r.versionId != null) onCurrentVersionChange?.(r.versionId);
      onVersionsChanged();
      settleSaved(workflowCode);
    } catch (error) {
      Toast.error(`${t('editor.publishFailed')}${(error as Error).message}`);
    } finally {
      setPublishingVersion(false);
    }
  };

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

  // 2026-11-04 单身份改版：正式模式「保存」按钮已移除——本地草稿自动持久化
  // （IndexedDB + beforeunload 守卫），产生版本的唯一动作是「发布生效」
  // （handlePublishClick / handleConfirmPublish / handlePublishEffective）。
  // 旧的 createVersion 路径（前端算版本号 + is_current=0 的"存了不生效"版本）随之停用。

  /** 草稿模式保存：把眼前画布推成归属会话的服务端草稿（AI 可见），并清未保存标记。
   *  落版不在这里 —— 版本化动作统一在会话页「保存为版本」。 */
  const handleDraftSave = async () => {
    const target = resolveDraftTargetSession();
    if (!target) {
      alert(t('editor.syncNoSession'));
      return;
    }
    setSaving(true);
    try {
      const res = await saveCanvasDraft({ source: 'manual-save' });
      if (!res.ok) throw new Error(res.error || 'save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Draft save failed:', error);
      alert(t('editor.saveFailed') + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /** 首次发布：用户给出工作流编码后经 applyDsl 建流落版（新工作流首版即生效版）。
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
        workflowName: displayName || code,
        versionDesc: t('editor.publishInitialDesc'),
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

  // 设为生效版本 / 切换查看版本都收进了历史面板，头部不再自己实现一遍

  return (
    <div
      className="gaia-editor-head"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '52px',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onBack}
          className="gaia-head-btn"
          style={{
            padding: '5px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'background 0.15s',
          }}
        >
          {t('editor.back')}
        </button>
        {/* 名称就地编辑（2026-11-05）：点击变输入框，Enter/失焦确认、Esc 还原；随下次发布生效 */}
        {nameEdit ? (
          <input
            value={nameDraft}
            autoFocus
            aria-label={t('editor.nameEditHint')}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => setNameEdit(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setNameDraft(workflowName);
                setNameEdit(false);
              }
            }}
            style={{
              fontSize: '15px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6,
              border: '1px solid var(--g-editor-accent, #4d53e8)',
              outline: 'none',
              width: 220,
              background: 'var(--ge-surface, #fff)',
              color: 'inherit',
            }}
          />
        ) : (
          <span
            title={draftMode ? undefined : t('editor.nameEditHint')}
            onClick={() => !draftMode && setNameEdit(true)}
            style={{
              fontSize: '15px',
              fontWeight: 600,
              cursor: draftMode ? 'default' : 'text',
              padding: '2px 6px',
              borderRadius: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {displayName}
            {!draftMode && <IconEdit size="small" style={{ opacity: 0.4 }} />}
          </span>
        )}

        {/* 状态徽标（2026-11-05 从右侧移到名称旁）：生效状态一眼可读，替代旧的 vN 三态标签与未保存角标 */}
        {!draftMode && workflowCode && versions.length > 0 && (
          <span
            style={
              inSyncWithEffective
                ? {
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#1f9d63',
                    background: 'rgba(31, 157, 99, 0.12)',
                    borderRadius: 4,
                    padding: '3px 8px',
                  }
                : {
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#d4a017',
                    background: 'rgba(212, 160, 23, 0.12)',
                    borderRadius: 4,
                    padding: '3px 8px',
                  }
            }
            title={
              inSyncWithEffective
                ? undefined
                : previewingOtherVersion
                ? t('editor.publishEffectiveContent', { v: matchedVersion!.versionNumber })
                : t('editor.statusUnpublishedHint')
            }
          >
            {inSyncWithEffective
              ? `✓ ${t('editor.statusInSync', { v: effectiveVersion!.versionNumber })}`
              : previewingOtherVersion
              ? t('editor.statusPreview', {
                  v: matchedVersion!.versionNumber,
                  cur: effectiveVersion?.versionNumber || '',
                })
              : `● ${t('editor.statusUnpublished')}`}
          </span>
        )}

        {/* 草稿模式合并徽标（2026-11-05）：替代右侧并置的「会话草稿」标签 + 未保存角标 */}
        {draftMode && (
          <span
            title={t('editor.unsavedHint')}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#d4a017',
              background: 'rgba(212, 160, 23, 0.12)',
              borderRadius: 4,
              padding: '3px 8px',
            }}
          >
            {t('editor.sessionDraft')}{unsaved ? ` · ${t('editor.unsavedBadge')}` : ''}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* 版本 / 历史：整页唯一入口。统一时间线（2026-11-03）：会话快照与落版版本
            混排成一列，动作统一为「载入 / 对比」——「撤销 AI 这一轮」和「载入 v1.1」
            不再是两个分区里的两套词。 */}
        {hasHistory && (
          <CanvasHistoryPopover workflowCode={workflowCode} onLoadVersion={onSwitchVersion}>
            <SemiButton
              theme="borderless"
              icon={<IconHistory />}
              style={{ fontSize: '13px', color: '#555', height: '32px' }}
            >
              {t('chat.historyTitle')}
              <IconChevronDown size="small" style={{ marginLeft: '4px' }} />
            </SemiButton>
          </CanvasHistoryPopover>
        )}

        {/* 发布生效（2026-11-04 单身份改版）：正式模式唯一产生版本的动作，常驻。
            内容路由：画布恰好等于某个旧版本 → set-current 指针回拨（确认弹层）；
            否则 → applyDsl 生成新版本并立即生效（确认弹窗 + AI 代拟说明）。
            预览旧版场景 Popconfirm 的 v 号取自 matchedVersion（内容判定）。 */}
        {!draftMode &&
          (previewingOtherVersion ? (
            <Popconfirm
              title={t('editor.publishEffectiveTitle', { v: matchedVersion!.versionNumber })}
              content={t('editor.publishEffectiveContent', { v: matchedVersion!.versionNumber })}
              okText={t('editor.publishEffectiveOk')}
              cancelText={t('common.cancel')}
              onConfirm={handlePublishEffective}
            >
              <button
                disabled={publishingEffective}
                style={{
                  background: ACCENT,
                  border: 'none',
                  color: '#fff',
                  padding: '7px 18px',
                  borderRadius: '6px',
                  cursor: publishingEffective ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {t('editor.publishEffective')}
              </button>
            </Popconfirm>
          ) : (
            <button
              onClick={handlePublishClick}
              disabled={inSyncWithEffective || publishingVersion}
              title={inSyncWithEffective ? t('editor.statusInSyncHint') : undefined}
              style={{
                background: inSyncWithEffective || publishingVersion ? '#c5c5e8' : ACCENT,
                border: 'none',
                color: '#fff',
                padding: '7px 18px',
                borderRadius: '6px',
                cursor: inSyncWithEffective || publishingVersion ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'background 0.15s',
              }}
            >
              {t('editor.publishEffective')}
            </button>
          ))}

        {/* 发布为 API 与测试用例已从头部移除（2026-11-04 用户决策）：
            API 发布/文档收进工作流管理页行内「更多 → API 文档」（ApiDocModal 原位发布）；
            测试用例收进画布工具栏运行组（DemoTools，testWorkflowCode 传入）。 */}

        {/* 草稿模式保存（2026-11-05）：「会话草稿」标识已并入左侧状态徽标 */}
        {draftMode && (
          <DraftSaveControls
            saving={saving}
            saved={saved}
            unsaved={unsaved}
            onSave={handleDraftSave}
          />
        )}
        {/* 编辑器偏好（2026-11-05 置尾）：外观 / 工作区 / 节点添加方式；专家模式标识在面板内 */}
        <EditorPrefsPanel />
      </div>

      {/* 首次发布需要工作流编码：草稿模式下没有可寻址的版本容器，明确要一个编码
          而不是静默「已保存」（阶段 1.2）。新建后经 applyDsl 落为首版（即生效版）。
          2026-11-04 单身份改版：入口从「保存」移到「发布生效」。 */}
      <Modal
        title={t('editor.needCodeTitle')}
        visible={codeAskOpen}
        onCancel={() => setCodeAskOpen(false)}
        onOk={handleSaveWithNewCode}
        okButtonProps={{ loading: saving }}
        okText={t('editor.publishEffectiveOk')}
        cancelText={t('common.cancel')}
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

      {/* 发布确认弹窗（2026-11-04 单身份改版）：applyDsl 生成新版本并立即生效。
          版本说明有归属会话时 AI 代拟（失败留空）；版本号后端统一编排。 */}
      <Modal
        title={t('editor.publishEffective')}
        visible={publishModalOpen}
        onCancel={() => setPublishModalOpen(false)}
        onOk={handleConfirmPublish}
        okButtonProps={{ loading: publishingVersion }}
        okText={t('editor.publishEffectiveOk')}
        cancelText={t('common.cancel')}
      >
        <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
          {t('editor.publishSubtitle')}
        </div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
          {t('editor.publishDescLabel')}
        </div>
        <Input
          value={publishDesc}
          onChange={(v) => setPublishDesc(v)}
          placeholder={
            publishDescLoading ? t('editor.descGenerating') : t('workspace.versionDescPlaceholder')
          }
        />
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
    workflowApi
      .listTemplates()
      .then((list) => {
        const tpl = list?.find((t) => t.templateCode === templateCode);
        if (!tpl) {
          setLoading(false);
          return;
        }
        setTemplateInfo(tpl);
        if (tpl.templateData) {
          try {
            const parsed =
              typeof tpl.templateData === 'string'
                ? JSON.parse(tpl.templateData)
                : tpl.templateData;
            // 空模板（无节点）兜底为 Start → End，避免画布空白
            setTemplateData(parsed?.nodes?.length ? parsed : emptyWorkflowData);
          } catch {
            setTemplateData(emptyWorkflowData);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [templateCode]);

  const editorProps = useEditorProps(templateData, nodeRegistries);

  if (loading) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}
      >
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
    <div
      style={{
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
      }}
    >
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
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f5f5f7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
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
