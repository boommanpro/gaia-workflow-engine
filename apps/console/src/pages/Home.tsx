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
import { publicPath } from '../utils/public-path';
import { useLanguage, t } from '../i18n';
import { LanguageToggle } from '../components/language-toggle';

const ACCENT = '#4d53e8';
const FONT_STACK =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

const FEATURE_KEYS = [
  { titleKey: 'feature.canvas.title', descKey: 'feature.canvas.desc' },
  { titleKey: 'feature.nodes.title', descKey: 'feature.nodes.desc' },
  { titleKey: 'feature.preview.title', descKey: 'feature.preview.desc' },
  { titleKey: 'feature.version.title', descKey: 'feature.version.desc' },
  { titleKey: 'feature.template.title', descKey: 'feature.template.desc' },
  { titleKey: 'feature.plugin.title', descKey: 'feature.plugin.desc' },
];

const STEP_KEYS = [
  { titleKey: 'step.create.title', descKey: 'step.create.desc' },
  { titleKey: 'step.design.title', descKey: 'step.design.desc' },
  { titleKey: 'step.deploy.title', descKey: 'step.deploy.desc' },
];

const TECH_ITEMS = ['React 18', 'TypeScript', 'Spring Boot', 'MyBatis Plus', 'SQLite'];
const PREREQ_ITEMS = ['Node.js >= 18', 'Java >= 17', 'Maven 3.x', 'Git'];
const FRONTEND_STEPS = [
  'git clone https://github.com/boommanpro/gaia-workflow-engine.git',
  'cd gaia-workflow-engine/apps/console',
  'npm install',
  'npm run dev',
];
const BACKEND_STEPS = ['cd apps/api/gaia-workflow', 'mvn spring-boot:run'];

const DEPLOY_KEYS = [
  { titleKey: 'deploy.standalone.title', descKey: 'deploy.standalone.desc' },
  { titleKey: 'deploy.allinone.title', descKey: 'deploy.allinone.desc' },
  { titleKey: 'deploy.ghpages.title', descKey: 'deploy.ghpages.desc' },
  { titleKey: 'deploy.container.title', descKey: 'deploy.container.desc' },
];

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

export const Home = () => {
  const navigate = useNavigate();
  const lang = useLanguage();
  const [backendOnline, setBackendOnline] = useState(false);
  const [viewerData, setViewerData] = useState<any>(initialData);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

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

    // 尝试加载第一个工作流的版本数据用于预览
    (async () => {
      try {
        const workflows = await workflowApi.listWorkflows();
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
          <img src={publicPath('logo.svg')} alt="Gaia" style={{ width: 48, height: 48 }} />
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1 }}>Gaia</div>
            <div style={{ fontSize: '11px', color: '#999', lineHeight: '16px' }}>
              {lang === 'zh' ? t('home.subtitle') : t('home.subtitleAlt')}
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
            {t('nav.demo')}
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
            {t('nav.docs')}
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
            {t('nav.releases')}
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
              {backendOnline ? t('status.online') : t('status.offline')}
            </span>
            {!backendOnline && (
              <span style={{ fontSize: '11px', color: '#999', textDecoration: 'underline' }}>
                ⚙
              </span>
            )}
          </div>
          <LanguageToggle />
          <a
            href="https://github.com/boommanpro/gaia-workflow-engine"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub"
            style={{
              display: 'flex',
              alignItems: 'center',
              color: '#555',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f7'; e.currentTarget.style.color = '#1a1a1a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555'; }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
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
            {t('nav.admin')}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: '60px 32px 40px',
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 800,
            lineHeight: 1.1,
            margin: '0 0 20px',
            letterSpacing: '-0.02em',
          }}>
            {t('hero.title')}
          </h1>
        </div>

        {/* Large canvas — borderless, blends with background */}
        <div id="demo" style={{
          maxWidth: '1500px',
          margin: '56px auto 0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <WorkflowViewer data={viewerData} height={720} />
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 36px)', fontWeight: 700, margin: '0 0 12px' }}>
              {t('features.title')}
            </h2>
            <p style={{ fontSize: '16px', color: '#666' }}>{t('features.subtitle')}</p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
          }}>
            {FEATURE_KEYS.map((item, i) => {
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
                  <h3 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 8px' }}>{t(item.titleKey)}</h3>
                  <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, margin: 0 }}>{t(item.descKey)}</p>
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
              {t('steps.title')}
            </h2>
            <p style={{ fontSize: '16px', color: '#666' }}>{t('steps.subtitle')}</p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '32px',
          }}>
            {STEP_KEYS.map((step, i) => (
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
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>{t(step.titleKey)}</h3>
                <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>{t(step.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{ padding: '60px 48px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, margin: '0 0 8px' }}>
            {t('tech.title')}
          </h2>
          <p style={{ fontSize: '15px', color: '#666', marginBottom: '32px' }}>{t('tech.subtitle')}</p>
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {TECH_ITEMS.map((item, i) => (
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
              {t('docs.title')}
            </h2>
            <p style={{ fontSize: '16px', color: '#666' }}>{t('docs.subtitle')}</p>
          </div>

          {/* Prerequisites */}
          <div style={{
            background: '#fff',
            border: '1px solid #f0f0f2',
            borderRadius: '12px',
            padding: '28px',
            marginBottom: '24px',
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 16px' }}>{t('docs.prereqTitle')}</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {PREREQ_ITEMS.map((item, i) => (
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
              <h3 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 16px' }}>{t('docs.frontendTitle')}</h3>
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
                <code>{FRONTEND_STEPS.join('\n')}</code>
              </pre>
              <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>{t('docs.frontendNote')}</p>
            </div>

            {/* Backend */}
            <div style={{
              background: '#fff',
              border: '1px solid #f0f0f2',
              borderRadius: '12px',
              padding: '28px',
            }}>
              <h3 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 16px' }}>{t('docs.backendTitle')}</h3>
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
                <code>{BACKEND_STEPS.join('\n')}</code>
              </pre>
              <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>{t('docs.backendNote')}</p>
            </div>
          </div>

          {/* Deployment Options */}
          <div style={{
            background: '#fff',
            border: '1px solid #f0f0f2',
            borderRadius: '12px',
            padding: '28px',
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 20px' }}>{t('docs.deployTitle')}</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
            }}>
              {DEPLOY_KEYS.map((item, i) => (
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
                    {t(item.titleKey)}
                  </div>
                  <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.6, margin: 0 }}>{t(item.descKey)}</p>
                </div>
              ))}
            </div>
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
            {t('cta.title')}
          </h2>
          <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '28px' }}>{t('cta.subtitle')}</p>
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
            {t('cta.button')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '32px 48px',
        borderTop: '1px solid #f0f0f2',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '14px', color: '#999', marginBottom: '4px' }}>{t('footer.desc')}</div>
        <div style={{ fontSize: '13px', color: '#bbb' }}>{t('footer.copyright')}</div>
      </footer>

      {/* Server Config Modal */}
      <Modal
        title={t('serverConfig.title')}
        visible={showServerConfig}
        onCancel={() => setShowServerConfig(false)}
        footer={null}
        width={480}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', lineHeight: 1.6 }}>
            {t('serverConfig.desc')}
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
              {t('Cancel')}
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
              {t('serverConfig.saveReconnect')}
            </SemiButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
