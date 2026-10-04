/**
 * Gaia 盖亚 — Release Log Page
 * 独立发布日志页面，具备 Home / Release Log 导航
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReleaseTimeline } from '../components/ReleaseTimeline';
import { publicPath } from '../utils/public-path';

type Lang = 'en' | 'zh';

const ACCENT = '#4d53e8';
const FONT_STACK =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

export const Releases = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>('en');

  const t = {
    nav: {
      home: lang === 'zh' ? '首页' : 'Home',
      releases: lang === 'zh' ? '发布日志' : 'Release Log',
      admin: lang === 'zh' ? '管理后台' : 'Admin Console',
    },
    title: lang === 'zh' ? '发布日志' : 'Release Log',
    subtitle: lang === 'zh' ? '项目里程碑与版本历史' : 'Project milestones and version history',
    latest: lang === 'zh' ? '最新' : 'LATEST',
    footer: {
      desc: lang === 'zh' ? '盖亚 — 可视化 AI 工作流编辑器' : 'Gaia — Visual AI workflow editor',
      copyright: lang === 'zh' ? '© 2026 盖亚 Gaia.' : '© 2026 Gaia.',
    },
  };

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img src={publicPath('logo.svg')} alt="Gaia" style={{ width: 48, height: 48 }} />
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1 }}>Gaia</div>
            <div style={{ fontSize: '11px', color: '#999', lineHeight: '16px' }}>
              {lang === 'zh' ? '盖亚' : 'AI Workflow Editor'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Home 按钮 */}
          <button
            onClick={() => navigate('/')}
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
            {t.nav.home}
          </button>
          {/* Release Log 按钮（当前页高亮） */}
          <button
            style={{
              padding: '6px 0',
              background: 'transparent',
              border: 'none',
              cursor: 'default',
              fontSize: '14px',
              color: ACCENT,
              fontWeight: 600,
              borderBottom: `2px solid ${ACCENT}`,
            }}
          >
            {t.nav.releases}
          </button>
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

      {/* Release Log Timeline */}
      <section id="releases" style={{ padding: '80px 48px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 style={{ fontSize: 'clamp(28px, 3.5vw, 36px)', fontWeight: 700, margin: '0 0 12px' }}>
              {t.title}
            </h1>
            <p style={{ fontSize: '16px', color: '#666' }}>{t.subtitle}</p>
          </div>

          <ReleaseTimeline />
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
    </div>
  );
};
