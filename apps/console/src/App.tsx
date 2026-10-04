import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';

import { Releases } from './pages/Releases';
import { LandingPage } from './pages/LandingPage';
import { Home } from './pages/Home';
import { Editor, TemplateEditor } from './editor';
import { AdminLayout } from './pages/admin/AdminLayout';
import { WorkflowManagement } from './pages/admin/WorkflowManagement';
import { TemplateManagement } from './pages/admin/TemplateManagement';
import { AgentConfigManagement } from './pages/admin/AgentConfigManagement';
import { SessionReview } from './pages/admin/SessionReview';
import { AgentProvider } from './agent';
import { AiWorkspace } from './ai-workspace';
import ScrollPage from './components/ScrollPage';

/** 旧地址 /c/:sessionKey → 新地址 /chat/:sessionKey */
const LegacyChatRedirect = () => {
  const { sessionKey } = useParams<{ sessionKey: string }>();
  return <Navigate to={sessionKey ? `/chat/${sessionKey}` : '/chat'} replace />;
};

/** 旧地址 /admin/* → 新地址 /manage/*（保留子路径） */
const LegacyAdminRedirect = () => {
  const { pathname } = useLocation();
  return <Navigate to={pathname.replace(/^\/admin/, '/manage')} replace />;
};

/**
 * 路由表 —— 三层模式各有自己的地址空间：
 *
 *   /chat,  /chat/:sessionKey    Chat   · 纯对话
 *   /work,  /work/c/:sessionKey  Work   · 工作空间（文件夹分组的对话）
 *   /manage/*                    Manage · 管理端（工作流 / 模板 / Agent 配置 / 会话审查）
 *
 *   /                    产品首页（对话即 API 入口）
 *   /releases            版本记录
 *   /editor/:workflowCode 专家模式 · 画布主位
 *
 * 注意：任何新增的前端路由都不要以 /api 开头。
 * 开发服务器把 /api 前缀代理到了后端（rsbuild.config.ts 的 proxy），
 * 以 /api 开头的前端路由会被代理吞掉直接命中后端，页面报 Whitelabel 404。
 */
function App() {
  return (
    <AgentProvider>
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <Routes>
          {/* 产品首页（对话创建 API 入口） */}
          <Route path="/" element={<LandingPage />} />

          {/* Chat · 纯对话 */}
          <Route path="/chat" element={<AiWorkspace />} />
          <Route path="/chat/:sessionKey" element={<AiWorkspace />} />

          {/* Work · 工作空间（文件夹分组的对话） */}
          <Route path="/work" element={<AiWorkspace />} />
          <Route path="/work/c/:sessionKey" element={<AiWorkspace />} />

          {/* 旧地址重定向 */}
          <Route path="/c/:sessionKey" element={<LegacyChatRedirect />} />
          <Route path="/admin/*" element={<LegacyAdminRedirect />} />

          {/* 内容页 */}
          <Route path="/preview" element={<ScrollPage><Home /></ScrollPage>} />
          <Route path="/releases" element={<ScrollPage><Releases /></ScrollPage>} />

          {/* Manage · 管理端 */}
          <Route path="/manage" element={<AdminLayout />}>
            <Route index element={<Navigate to="/manage/workflows" replace />} />
            <Route path="workflows" element={<WorkflowManagement />} />
            <Route path="templates" element={<TemplateManagement />} />
            <Route path="agent-config" element={<AgentConfigManagement />} />
            <Route path="sessions" element={<SessionReview />} />
          </Route>

          {/* 专家模式 */}
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/:workflowCode" element={<Editor />} />
          <Route path="/template-editor/:templateCode" element={<TemplateEditor />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AgentProvider>
  );
}

export default App;
