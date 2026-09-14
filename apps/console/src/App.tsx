import { Routes, Route, Navigate } from 'react-router-dom';

import { Releases } from './pages/Releases';
import { LandingPage } from './pages/LandingPage';
import { Home } from './pages/Home';
import { ApiDocsPage } from './pages/ApiDocsPage';
import { DashboardPage } from './pages/DashboardPage';
import { Editor, TemplateEditor } from './editor';
import { AdminLayout } from './pages/admin/AdminLayout';
import { WorkflowManagement } from './pages/admin/WorkflowManagement';
import { TemplateManagement } from './pages/admin/TemplateManagement';
import { AgentConfigManagement } from './pages/admin/AgentConfigManagement';
import { SessionReview } from './pages/admin/SessionReview';
import { AgentProvider } from './agent';
import { AiWorkspace } from './ai-workspace';
import ScrollPage from './components/ScrollPage';

/**
 * 路由表 —— 每个形态都有自己的地址，可以收藏、可以分享、可以前进后退。
 *
 *   /                    产品首页（DeepSeek 风对话入口，发起对话→创建 API）
 *   /c/:sessionKey       通用模式 · AI 工作区（对话核心，产物即工作流）
 *   /preview             预览页（原产品介绍页：内嵌可交互画布演示 + 项目说明）
 *   /docs                对外 API 调用文档（列表 / 详情）
 *   /dashboard           调用数据看板（总览 / 单 API）
 *   /editor/:workflowCode 专家模式 · 画布主位
 *   /admin/*             管理后台
 *   /releases            版本记录
 *
 * 注意：API 文档路由用 /docs 而不是 /api-docs。
 * 开发服务器把 /api 前缀代理到了后端（rsbuild.config.ts 的 proxy），
 * /api-docs 会被代理吞掉直接命中后端，页面报 Whitelabel 404。
 * 任何新增的前端路由都不要以 /api 开头。
 */
function App() {
  return (
    <AgentProvider>
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <Routes>
          {/* 产品首页（对话创建 API 入口） */}
          <Route path="/" element={<LandingPage />} />

          {/* 通用模式 · 对话核心 */}
          <Route path="/c/:sessionKey" element={<AiWorkspace />} />

          {/* 内容页 */}
          <Route path="/preview" element={<ScrollPage><Home /></ScrollPage>} />
          <Route path="/docs" element={<ScrollPage><ApiDocsPage /></ScrollPage>} />
          <Route path="/docs/:workflowCode" element={<ScrollPage><ApiDocsPage /></ScrollPage>} />
          <Route path="/dashboard" element={<ScrollPage><DashboardPage /></ScrollPage>} />
          <Route path="/dashboard/:workflowCode" element={<ScrollPage><DashboardPage /></ScrollPage>} />
          <Route path="/releases" element={<ScrollPage><Releases /></ScrollPage>} />

          {/* 管理后台 */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/workflows" replace />} />
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
