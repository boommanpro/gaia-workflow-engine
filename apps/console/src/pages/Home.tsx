/**
 * Gaia 盖亚 — Product Landing Page
 * 国际化产品介绍页，简约白色国际风
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Input, Button as SemiButton } from '@douyinfe/semi-ui';
import { WorkflowViewer } from '../editor';
import { initialData } from '../initial-data';
import { workflowApi } from '../services/workflow-api';
import { getApiBaseUrl, updateApiBaseUrl } from '../utils/apiConfig';

type Lang = 'en' | 'zh';

const ACCENT = '#4d53e8';
const FONT_STACK =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

const translations = {
  en: {
    nav: {
      admin: 'Admin Console',
      demo: 'Live Demo',
      docs: 'Docs',
      releases: 'Release Log',
    },
    status: { online: 'Backend Online', offline: 'Backend Offline' },
    hero: {
      badge: 'Powered by flowgram.ai',
      title: 'Build AI workflows, visually.',
      subtitle:
        'Gaia is a visual workflow editor for building AI applications. Design, test, and deploy complex AI pipelines on an infinite canvas — no code required.',
      ctaPrimary: 'Explore Demo',
      ctaSecondary: 'Admin Console',
      statNodes: 'Node Types',
      statTemplates: 'Templates',
      statWorkflows: 'Workflows',
    },
    demo: {
      title: 'See it in action',
      subtitle:
        'A live, read-only preview of a Gaia workflow. Pan, zoom, and inspect nodes — all powered by the flowgram.ai engine.',
      badge: 'Read-only',
    },
    features: {
      title: 'Everything you need to build AI workflows',
      subtitle: 'A complete toolkit for visual AI pipeline development',
      items: [
        {
          title: 'Visual Canvas',
          desc: 'An infinite, zoomable canvas with drag-and-drop nodes. Design complex workflows with loops, branches, and conditional logic.',
        },
        {
          title: 'AI Node Types',
          desc: 'Built-in support for LLM calls, code execution, HTTP requests, string formatting, and variable management.',
        },
        {
          title: 'Real-time Preview',
          desc: 'Test individual nodes or the entire workflow with live input/output inspection and execution history.',
        },
        {
          title: 'Version Management',
          desc: 'Every save creates a version. Switch between versions, track changes, and roll back with one click.',
        },
        {
          title: 'Template System',
          desc: 'Create reusable workflow templates. Spin up new workflows from templates with a single click.',
        },
        {
          title: 'Extensible Plugins',
          desc: 'Powered by flowgram.ai plugin architecture: minimap, auto-layout, snap lines, node panel, and more.',
        },
      ],
    },
    steps: {
      title: 'From idea to deployment in three steps',
      subtitle: 'A streamlined workflow for building AI applications',
      items: [
        {
          title: 'Create',
          desc: 'Start from scratch or pick a template. Name your workflow and you are ready to design.',
        },
        {
          title: 'Design',
          desc: 'Drag nodes onto the canvas, connect them, configure inputs. Test as you go with real-time preview.',
        },
        {
          title: 'Deploy',
          desc: 'Save your workflow with version tracking. Revisit, iterate, and roll back anytime.',
        },
      ],
    },
    tech: {
      title: 'Built on a solid foundation',
      subtitle: 'Open-source technologies, battle-tested at scale',
      items: ['flowgram.ai 1.0.12', 'React 18', 'TypeScript', 'Spring Boot', 'MyBatis Plus', 'SQLite'],
    },
    docs: {
      title: 'Documentation',
      subtitle: 'Everything you need to get started',
      prereqTitle: 'Prerequisites',
      prereqItems: ['Node.js >= 18', 'Java >= 17', 'Maven 3.x', 'Git'],
      frontendTitle: 'Frontend',
      frontendSteps: [
        'git clone https://github.com/boommanpro/gaia-workflow-engine.git',
        'cd gaia-workflow-engine/apps/console',
        'npm install',
        'npm run dev',
      ],
      frontendNote: 'Visit http://localhost:3000',
      backendTitle: 'Backend',
      backendSteps: [
        'cd apps/api/gaia-workflow',
        'mvn spring-boot:run',
      ],
      backendNote: 'API server runs on port 48080',
      deployTitle: 'Deployment Options',
      deployItems: [
        { title: 'Standalone', desc: 'Frontend and backend deployed separately for large distributed systems.' },
        { title: 'All-in-One', desc: 'Bundled as a single application for small to medium teams.' },
        { title: 'GitHub Pages', desc: 'Frontend deployed to GitHub Pages with configurable backend address.' },
        { title: 'Containerized', desc: 'Docker images with Kubernetes support for cloud deployment.' },
      ],
      repoLabel: 'Repository',
    },
    cta: {
      title: 'Ready to build your first AI workflow?',
      subtitle: 'Open the admin console to create, edit, and manage your workflows.',
      button: 'Open Admin Console',
    },
    footer: {
      desc: 'Gaia — Visual AI workflow editor',
      copyright: '© 2026 Gaia. Built with flowgram.ai.',
    },
  },
  zh: {
    nav: {
      admin: '管理后台',
      demo: '在线演示',
      docs: '文档',
      releases: '发布日志',
    },
    status: { online: '后端已连接', offline: '后端未连接' },
    hero: {
      badge: '基于 flowgram.ai 驱动',
      title: '可视化构建 AI 工作流',
      subtitle:
        '盖亚是一个可视化工作流编辑器，用于构建 AI 应用。在无限画布上设计、测试和部署复杂的 AI 流程——无需编写代码。',
      ctaPrimary: '查看演示',
      ctaSecondary: '管理后台',
      statNodes: '节点类型',
      statTemplates: '模板',
      statWorkflows: '工作流',
    },
    demo: {
      title: '实时预览',
      subtitle: '盖亚工作流的只读实时预览。可平移、缩放、查看节点详情——全部由 flowgram.ai 引擎驱动。',
      badge: '只读模式',
    },
    features: {
      title: '构建 AI 工作流所需的一切',
      subtitle: '可视化 AI 流程开发的完整工具链',
      items: [
        {
          title: '可视化画布',
          desc: '无限缩放画布，支持拖拽节点。通过循环、分支和条件逻辑设计复杂的工作流。',
        },
        {
          title: 'AI 节点类型',
          desc: '内置 LLM 调用、代码执行、HTTP 请求、字符串格式化和变量管理节点。',
        },
        {
          title: '实时预览',
          desc: '测试单个节点或整个工作流，实时查看输入输出和执行历史。',
        },
        {
          title: '版本管理',
          desc: '每次保存创建一个版本。在版本间切换、追踪变更、一键回滚。',
        },
        {
          title: '模板系统',
          desc: '创建可复用的工作流模板。一键从模板创建新工作流。',
        },
        {
          title: '可扩展插件',
          desc: '基于 flowgram.ai 插件架构：小地图、自动布局、吸附线、节点面板等。',
        },
      ],
    },
    steps: {
      title: '三步从创意到部署',
      subtitle: '构建 AI 应用的精简流程',
      items: [
        {
          title: '创建',
          desc: '从零开始或选择模板。命名工作流，即可开始设计。',
        },
        {
          title: '设计',
          desc: '拖拽节点到画布，连接节点，配置输入。随时实时预览测试。',
        },
        {
          title: '部署',
          desc: '保存工作流并启用版本追踪。随时回访、迭代和回滚。',
        },
      ],
    },
    tech: {
      title: '建立在坚实的技术之上',
      subtitle: '开源技术，大规模验证',
      items: ['flowgram.ai 1.0.12', 'React 18', 'TypeScript', 'Spring Boot', 'MyBatis Plus', 'SQLite'],
    },
    docs: {
      title: '文档',
      subtitle: '开始使用所需的一切',
      prereqTitle: '环境准备',
      prereqItems: ['Node.js >= 18', 'Java >= 17', 'Maven 3.x', 'Git'],
      frontendTitle: '前端',
      frontendSteps: [
        'git clone https://github.com/boommanpro/gaia-workflow-engine.git',
        'cd gaia-workflow-engine/apps/console',
        'npm install',
        'npm run dev',
      ],
      frontendNote: '访问 http://localhost:3000',
      backendTitle: '后端',
      backendSteps: [
        'cd apps/api/gaia-workflow',
        'mvn spring-boot:run',
      ],
      backendNote: 'API 服务运行在 48080 端口',
      deployTitle: '部署方案',
      deployItems: [
        { title: '独立部署', desc: '前后端分离部署，适用于大型分布式系统。' },
        { title: '一体化部署', desc: '打包为单一应用，适用于中小型企业。' },
        { title: 'GitHub Pages', desc: '前端部署到 GitHub Pages，后端地址可配置。' },
        { title: '容器化部署', desc: '提供 Docker 镜像，支持 Kubernetes 部署。' },
      ],
      repoLabel: '仓库地址',
    },
    cta: {
      title: '准备好构建你的第一个 AI 工作流了吗？',
      subtitle: '打开管理后台来创建、编辑和管理你的工作流。',
      button: '打开管理后台',
    },
    footer: {
      desc: '盖亚 — 可视化 AI 工作流编辑器',
      copyright: '© 2026 盖亚 Gaia. 基于 flowgram.ai 构建.',
    },
  },
};

const IconCanvas = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="2" y="2" width="10" height="10" rx="2" stroke={ACCENT} strokeWidth="2" />
    <rect x="16" y="2" width="10" height="10" rx="2" stroke={ACCENT} strokeWidth="2" />
    <rect x="2" y="16" width="10" height="10" rx="2" stroke={ACCENT} strokeWidth="2" />
    <rect x="16" y="16" width="10" height="10" rx="2" stroke={ACCENT} strokeWidth="2" />
    <line x1="12" y1="7" x2="16" y2="7" stroke={ACCENT} strokeWidth="2" />
    <line x1="7" y1="12" x2="7" y2="16" stroke={ACCENT} strokeWidth="2" />
  </svg>
);

const IconNodes = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="5" stroke={ACCENT} strokeWidth="2" />
    <circle cx="6" cy="6" r="3" stroke={ACCENT} strokeWidth="2" />
    <circle cx="22" cy="6" r="3" stroke={ACCENT} strokeWidth="2" />
    <circle cx="6" cy="22" r="3" stroke={ACCENT} strokeWidth="2" />
    <circle cx="22" cy="22" r="3" stroke={ACCENT} strokeWidth="2" />
    <line x1="9" y1="9" x2="11" y2="11" stroke={ACCENT} strokeWidth="2" />
    <line x1="19" y1="9" x2="17" y2="11" stroke={ACCENT} strokeWidth="2" />
    <line x1="9" y1="19" x2="11" y2="17" stroke={ACCENT} strokeWidth="2" />
    <line x1="19" y1="19" x2="17" y2="17" stroke={ACCENT} strokeWidth="2" />
  </svg>
);

const IconPreview = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M2 14C2 14 6 6 14 6C22 6 26 14 26 14C26 14 22 22 14 22C6 22 2 14 2 14Z" stroke={ACCENT} strokeWidth="2" />
    <circle cx="14" cy="14" r="4" stroke={ACCENT} strokeWidth="2" />
  </svg>
);

const IconVersion = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M14 2V14L22 18" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
    <circle cx="14" cy="14" r="12" stroke={ACCENT} strokeWidth="2" />
  </svg>
);

const IconTemplate = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="3" y="3" width="22" height="22" rx="2" stroke={ACCENT} strokeWidth="2" />
    <line x1="3" y1="10" x2="25" y2="10" stroke={ACCENT} strokeWidth="2" />
    <line x1="10" y1="10" x2="10" y2="25" stroke={ACCENT} strokeWidth="2" />
  </svg>
);

const IconPlugin = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M10 4H18V10H22V18H18V24H10V18H6V10H10V4Z" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const featureIcons = [IconCanvas, IconNodes, IconPreview, IconVersion, IconTemplate, IconPlugin];

const HeroDiagram = () => (
  <svg viewBox="0 0 400 300" fill="none" style={{ width: '100%', height: 'auto' }}>
    <rect x="20" y="120" width="80" height="50" rx="8" fill="#f0f0ff" stroke={ACCENT} strokeWidth="2" />
    <text x="60" y="150" textAnchor="middle" fill={ACCENT} fontSize="12" fontFamily={FONT_STACK}>Start</text>
    <rect x="160" y="60" width="80" height="50" rx="8" fill="#f0f0ff" stroke={ACCENT} strokeWidth="2" />
    <text x="200" y="90" textAnchor="middle" fill={ACCENT} fontSize="12" fontFamily={FONT_STACK}>LLM</text>
    <rect x="160" y="180" width="80" height="50" rx="8" fill="#f0f0ff" stroke={ACCENT} strokeWidth="2" />
    <text x="200" y="210" textAnchor="middle" fill={ACCENT} fontSize="12" fontFamily={FONT_STACK}>Code</text>
    <rect x="300" y="120" width="80" height="50" rx="8" fill={ACCENT} />
    <text x="340" y="150" textAnchor="middle" fill="#fff" fontSize="12" fontFamily={FONT_STACK}>End</text>
    <path d="M100 145 L160 85" stroke={ACCENT} strokeWidth="2" markerEnd="url(#arrow)" />
    <path d="M100 145 L160 205" stroke={ACCENT} strokeWidth="2" markerEnd="url(#arrow)" />
    <path d="M240 85 L300 140" stroke={ACCENT} strokeWidth="2" markerEnd="url(#arrow)" />
    <path d="M240 205 L300 150" stroke={ACCENT} strokeWidth="2" markerEnd="url(#arrow)" />
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0 0 L8 3 L0 6 Z" fill={ACCENT} />
      </marker>
    </defs>
  </svg>
);

export const Home = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>('en');
  const [backendOnline, setBackendOnline] = useState(false);
  const [workflowCount, setWorkflowCount] = useState(0);
  const [templateCount, setTemplateCount] = useState(0);
  const [viewerData, setViewerData] = useState<any>(initialData);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

  const t = translations[lang];

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    workflowApi.health().then(() => setBackendOnline(true)).catch(() => {
      // 默认不弹窗，仅设置离线状态；用户点击状态灯时才弹窗
      setBackendOnline(false);
      setServerUrl(getApiBaseUrl());
    });

    // 加载工作流列表用于统计 + 尝试加载第一个工作流的数据用于预览
    (async () => {
      try {
        const [workflows, templates] = await Promise.all([
          workflowApi.listWorkflows(),
          workflowApi.listTemplates(),
        ]);
        setWorkflowCount(workflows?.length || 0);
        setTemplateCount(templates?.length || 0);

        // 尝试加载第一个工作流的版本数据用于预览
        if (workflows && workflows.length > 0) {
          const wf = workflows[0];
          if (wf.currentVersionId) {
            try {
              const version = await workflowApi.getVersionById(wf.currentVersionId);
              if (version?.workflowData) {
                const parsed = typeof version.workflowData === 'string'
                  ? JSON.parse(version.workflowData)
                  : version.workflowData;
                if (parsed?.nodes?.length > 0) {
                  setViewerData(parsed);
                }
              }
            } catch { /* keep initialData */ }
          }
        }
      } catch { /* ignore */ }
    })();
  }, []);

  return (
    <div style={{ fontFamily: FONT_STACK, background: '#fff', color: '#1a1a1a', minHeight: '100vh' }}>
      {/* Navigation */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 48px',
        height: '64px',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #f0f0f2',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: `linear-gradient(135deg, ${ACCENT}, #7b7ff5)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 800,
          }}>G</div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1 }}>Gaia</div>
            <div style={{ fontSize: '11px', color: '#999', lineHeight: '16px' }}>
              {lang === 'zh' ? '盖亚' : 'AI Workflow Editor'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              padding: '6px 0',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#555',
              fontWeight: 500,
            }}
          >
            {t.nav.demo}
          </button>
          <button
            onClick={() => document.getElementById('docs')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              padding: '6px 0',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#555',
              fontWeight: 500,
            }}
          >
            {t.nav.docs}
          </button>
          <button
            onClick={() => navigate('/releases')}
            style={{
              padding: '6px 0',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#555',
              fontWeight: 500,
            }}
          >
            {t.nav.releases}
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              cursor: backendOnline ? 'default' : 'pointer',
              padding: '4px 10px',
              borderRadius: '6px',
              transition: 'background 0.15s',
            }}
            onClick={() => {
              if (!backendOnline) {
                setServerUrl(getApiBaseUrl());
                setShowServerConfig(true);
              }
            }}
            onMouseEnter={(e) => { if (!backendOnline) e.currentTarget.style.background = '#f5f5f7'; }}
            onMouseLeave={(e) => { if (!backendOnline) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: backendOnline ? '#22c55e' : '#f59e0b',
            }} />
            <span style={{ color: backendOnline ? '#666' : '#d97706' }}>
              {backendOnline ? t.status.online : t.status.offline}
            </span>
            {!backendOnline && (
              <span style={{ fontSize: '11px', color: '#999', textDecoration: 'underline' }}>
                ⚙
              </span>
            )}
          </div>
          <button
            onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
            style={{
              padding: '6px 14px',
              border: '1px solid #e0e0e6',
              borderRadius: '6px',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#333',
            }}
          >
            {lang === 'en' ? '中文' : 'EN'}
          </button>
          <button
            onClick={() => navigate('/admin/workflows')}
            style={{
              padding: '8px 20px',
              background: ACCENT,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t.nav.admin}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: '80px 48px 60px',
        textAlign: 'center',
        maxWidth: '960px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-block',
          padding: '6px 14px',
          background: '#f0f0ff',
          color: ACCENT,
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 500,
          marginBottom: '24px',
        }}>
          {t.hero.badge}
        </div>
        <h1 style={{
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 800,
          lineHeight: 1.1,
          margin: '0 0 20px',
          letterSpacing: '-0.02em',
        }}>
          {t.hero.title}
        </h1>
        <p style={{
          fontSize: 'clamp(16px, 2vw, 20px)',
          color: '#666',
          lineHeight: 1.6,
          maxWidth: '680px',
          margin: '0 auto 36px',
        }}>
          {t.hero.subtitle}
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              padding: '14px 32px',
              background: ACCENT,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.hero.ctaPrimary}
          </button>
          <button
            onClick={() => navigate('/admin/workflows')}
            style={{
              padding: '14px 32px',
              background: '#fff',
              color: ACCENT,
              border: `1px solid ${ACCENT}`,
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.hero.ctaSecondary}
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: '48px',
          justifyContent: 'center',
          marginTop: '56px',
          flexWrap: 'wrap',
        }}>
          {[
            { value: '8+', label: t.hero.statNodes },
            { value: templateCount, label: t.hero.statTemplates },
            { value: workflowCount, label: t.hero.statWorkflows },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: ACCENT }}>{stat.value}</div>
              <div style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Hero Diagram */}
        <div style={{ marginTop: '48px', padding: '24px', background: '#fafafa', borderRadius: '16px' }}>
          <HeroDiagram />
        </div>
      </section>

      {/* Live Demo — Embedded Workflow Viewer */}
      <section id="demo" style={{
        padding: '60px 48px',
        background: '#fafafa',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 36px)', fontWeight: 700, margin: '0 0 12px' }}>
              {t.demo.title}
            </h2>
            <p style={{ fontSize: '16px', color: '#666', maxWidth: '600px', margin: '0 auto' }}>
              {t.demo.subtitle}
            </p>
          </div>
          <div style={{
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid #e8e8ea',
          }}>
            <WorkflowViewer data={viewerData} height={520} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 36px)', fontWeight: 700, margin: '0 0 12px' }}>
              {t.features.title}
            </h2>
            <p style={{ fontSize: '16px', color: '#666' }}>{t.features.subtitle}</p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
          }}>
            {t.features.items.map((item, i) => {
              const Icon = featureIcons[i];
              return (
                <div key={i} style={{
                  padding: '28px',
                  background: '#fff',
                  border: '1px solid #f0f0f2',
                  borderRadius: '12px',
                  transition: 'box-shadow 0.2s',
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    background: '#f5f5ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}>
                    <Icon />
                  </div>
                  <h3 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 8px' }}>{item.title}</h3>
                  <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 48px', background: '#fafafa' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 36px)', fontWeight: 700, margin: '0 0 12px' }}>
              {t.steps.title}
            </h2>
            <p style={{ fontSize: '16px', color: '#666' }}>{t.steps.subtitle}</p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '32px',
          }}>
            {t.steps.items.map((step, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: ACCENT,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 800,
                  margin: '0 auto 20px',
                }}>
                  {i + 1}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>{step.title}</h3>
                <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{ padding: '60px 48px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, margin: '0 0 8px' }}>
            {t.tech.title}
          </h2>
          <p style={{ fontSize: '15px', color: '#666', marginBottom: '32px' }}>{t.tech.subtitle}</p>
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {t.tech.items.map((item, i) => (
              <span key={i} style={{
                padding: '8px 18px',
                background: '#f5f5f7',
                borderRadius: '20px',
                fontSize: '14px',
                color: '#333',
                fontWeight: 500,
              }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Docs */}
      <section id="docs" style={{ padding: '80px 48px', background: '#fafafa' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 36px)', fontWeight: 700, margin: '0 0 12px' }}>
              {t.docs.title}
            </h2>
            <p style={{ fontSize: '16px', color: '#666' }}>{t.docs.subtitle}</p>
          </div>

          {/* Prerequisites */}
          <div style={{
            background: '#fff',
            border: '1px solid #f0f0f2',
            borderRadius: '12px',
            padding: '28px',
            marginBottom: '24px',
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 16px' }}>{t.docs.prereqTitle}</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {t.docs.prereqItems.map((item, i) => (
                <span key={i} style={{
                  padding: '6px 14px',
                  background: '#f5f5f7',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#333',
                  fontFamily: FONT_STACK,
                }}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Frontend + Backend */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            {/* Frontend */}
            <div style={{
              background: '#fff',
              border: '1px solid #f0f0f2',
              borderRadius: '12px',
              padding: '28px',
            }}>
              <h3 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 16px' }}>{t.docs.frontendTitle}</h3>
              <pre style={{
                background: '#1a1a2e',
                color: '#e0e0e0',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '13px',
                lineHeight: 1.7,
                overflow: 'auto',
                margin: '0 0 12px',
              }}>
                <code>{t.docs.frontendSteps.join('\n')}</code>
              </pre>
              <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>{t.docs.frontendNote}</p>
            </div>

            {/* Backend */}
            <div style={{
              background: '#fff',
              border: '1px solid #f0f0f2',
              borderRadius: '12px',
              padding: '28px',
            }}>
              <h3 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 16px' }}>{t.docs.backendTitle}</h3>
              <pre style={{
                background: '#1a1a2e',
                color: '#e0e0e0',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '13px',
                lineHeight: 1.7,
                overflow: 'auto',
                margin: '0 0 12px',
              }}>
                <code>{t.docs.backendSteps.join('\n')}</code>
              </pre>
              <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>{t.docs.backendNote}</p>
            </div>
          </div>

          {/* Deployment Options */}
          <div style={{
            background: '#fff',
            border: '1px solid #f0f0f2',
            borderRadius: '12px',
            padding: '28px',
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 20px' }}>{t.docs.deployTitle}</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
            }}>
              {t.docs.deployItems.map((item, i) => (
                <div key={i}>
                  <div style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    background: '#f0f0ff',
                    color: ACCENT,
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '8px',
                  }}>
                    {item.title}
                  </div>
                  <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Repo Link */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <a
              href="https://github.com/boommanpro/gaia-workflow-engine"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                border: `1px solid ${ACCENT}`,
                color: ACCENT,
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                background: '#fff',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5ff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              {t.docs.repoLabel}: github.com/boommanpro/gaia-workflow-engine
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 48px' }}>
        <div style={{
          maxWidth: '700px',
          margin: '0 auto',
          textAlign: 'center',
          padding: '56px 40px',
          background: `linear-gradient(135deg, ${ACCENT}, #7b7ff5)`,
          borderRadius: '20px',
          color: '#fff',
        }}>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, margin: '0 0 12px' }}>
            {t.cta.title}
          </h2>
          <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '28px' }}>{t.cta.subtitle}</p>
          <button
            onClick={() => navigate('/admin/workflows')}
            style={{
              padding: '14px 36px',
              background: '#fff',
              color: ACCENT,
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.cta.button}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '32px 48px',
        borderTop: '1px solid #f0f0f2',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '14px', color: '#999', marginBottom: '4px' }}>{t.footer.desc}</div>
        <div style={{ fontSize: '13px', color: '#bbb' }}>{t.footer.copyright}</div>
      </footer>

      {/* Server Config Modal */}
      <Modal
        title={lang === 'zh' ? '配置服务端地址' : 'Configure Server Address'}
        visible={showServerConfig}
        onCancel={() => setShowServerConfig(false)}
        footer={null}
        width={480}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', lineHeight: 1.6 }}>
            {lang === 'zh'
              ? '无法连接到后端服务。请输入您的后端服务地址（例如：http://127.0.0.1:48080/api）。保存后将自动刷新页面。'
              : 'Cannot connect to the backend service. Please enter your backend server address (e.g., http://127.0.0.1:48080/api). The page will reload after saving.'}
          </p>
          <Input
            value={serverUrl}
            onChange={(v) => setServerUrl(v)}
            placeholder="http://127.0.0.1:48080/api"
            style={{ width: '100%', marginBottom: '16px' }}
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <SemiButton
              onClick={() => setShowServerConfig(false)}
              style={{ borderRadius: '6px' }}
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </SemiButton>
            <SemiButton
              theme="solid"
              style={{ background: ACCENT, borderRadius: '6px' }}
              onClick={() => {
                if (serverUrl.trim()) {
                  updateApiBaseUrl(serverUrl.trim());
                  window.location.reload();
                }
              }}
            >
              {lang === 'zh' ? '保存并重连' : 'Save & Reconnect'}
            </SemiButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
