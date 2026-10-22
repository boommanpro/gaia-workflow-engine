import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';

import { Releases } from './pages/Releases';
import { LandingPage } from './pages/LandingPage';
import { Home } from './pages/Home';
import { Editor, TemplateEditor } from './editor';
import { AdminLayout } from './pages/admin/AdminLayout';
import { WorkflowsLayout } from './pages/admin/WorkflowsLayout';
import { WorkflowManagement } from './pages/admin/WorkflowManagement';
import { TemplateManagement } from './pages/admin/TemplateManagement';
import { AgentConfigManagement } from './pages/admin/AgentConfigManagement';
import { AgentProvider } from './agent';
import { AiWorkspace } from './ai-workspace';
import ScrollPage from './components/ScrollPage';

/** 路由级兜底：任何页面组件崩溃时给出错误提示和出路，绝不整页白屏 */
class RouteErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] route crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            fontFamily: 'inherit',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>页面渲染出错</div>
          <div
            style={{
              maxWidth: 640,
              color: 'var(--g-text-muted, #888)',
              fontSize: 12,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              textAlign: 'center',
              padding: '0 24px',
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '6px 18px', borderRadius: 6, cursor: 'pointer' }}
            >
              刷新页面
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              style={{ padding: '6px 18px', borderRadius: 6, cursor: 'pointer' }}
            >
              回首页
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** 旧地址 /c/:sessionKey → 新地址 /chat/:sessionKey */
const LegacyChatRedirect = () => {
  const { sessionKey } = useParams<{ sessionKey: string }>();
  return <Navigate to={sessionKey ? `/chat/${sessionKey}` : '/chat'} replace />;
};

/** 旧地址 /admin/* → 新地址：工作流管理是应用态一级页面 /workflows，其余进设置区 /manage/* */
const LegacyAdminRedirect = () => {
  const { pathname } = useLocation();
  const next = pathname.replace(/^\/admin\/workflows/, '/workflows').replace(/^\/admin/, '/manage');
  return <Navigate to={next} replace />;
};

/** 旧地址 /work/c/:sessionKey → 统一任务地址 /chat/:sessionKey（Chat/Work 双 scope 已合并） */
const LegacyWorkRedirect = () => {
  const { sessionKey } = useParams<{ sessionKey: string }>();
  return <Navigate to={sessionKey ? `/chat/${sessionKey}` : '/chat'} replace />;
};

/**
 * 路由表 —— 对话优先 IA：
 *
 *   /                    产品宣传首页（大输入框直通对话 + 管理入口）
 *   /chat, /chat/:sessionKey     对话主页（任务即会话，项目分组的入口在左栏 AppRail）
 *   /workflows                   工作流管理（应用态一级页面：打开编辑器 / 更多低频操作）
 *   /manage/*                    设置二级区（模板管理 / Agent 配置中心；左下角「设置」进入）
 *   /editor/:workflowCode        专家模式 · 画布主位（工具页，无内嵌对话）
 *
 *   /releases          版本记录
 *
 * 注意：任何新增的前端路由都不要以 /api 开头。
 * 开发服务器把 /api 前缀代理到了后端（rsbuild.config.ts 的 proxy），
 * 以 /api 开头的前端路由会被代理吞掉直接命中后端，页面报 Whitelabel 404。
 */
function App() {
  return (
    <AgentProvider>
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <RouteErrorBoundary>
          <Routes>
          {/* 产品宣传首页 */}
          <Route path="/" element={<LandingPage />} />

          {/* 对话主页（任务即会话） */}
          <Route path="/chat" element={<AiWorkspace />} />
          <Route path="/chat/:sessionKey" element={<AiWorkspace />} />

          {/* 工作流管理（应用态一级页面） */}
          <Route path="/workflows" element={<WorkflowsLayout />}>
            <Route index element={<WorkflowManagement />} />
          </Route>

          {/* 旧地址重定向 */}
          <Route path="/c/:sessionKey" element={<LegacyChatRedirect />} />
          <Route path="/work" element={<Navigate to="/chat" replace />} />
          <Route path="/work/c/:sessionKey" element={<LegacyWorkRedirect />} />
          <Route path="/admin/*" element={<LegacyAdminRedirect />} />

          {/* 内容页 */}
          <Route path="/preview" element={<ScrollPage><Home /></ScrollPage>} />
          <Route path="/releases" element={<ScrollPage><Releases /></ScrollPage>} />

          {/* 设置二级区（偏后台的能力；左下角「设置」进入） */}
          <Route path="/manage" element={<AdminLayout />}>
            <Route index element={<Navigate to="/manage/templates" replace />} />
            <Route path="templates" element={<TemplateManagement />} />
            <Route path="agent-config" element={<AgentConfigManagement />} />
          </Route>

          {/* 专家模式 */}
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/:workflowCode" element={<Editor />} />
          <Route path="/template-editor/:templateCode" element={<TemplateEditor />} />

          <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </RouteErrorBoundary>
      </div>
    </AgentProvider>
  );
}

export default App;
