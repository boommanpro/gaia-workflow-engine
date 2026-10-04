/**
 * 发布日志时间线（首页「发布日志」tab 与 /releases 页共用）。
 * 语言跟随全局 i18n（useLanguage）。
 */
import React from 'react';
import { useLanguage, t } from '../i18n';
const ACCENT = '#4d53e8';

export const releasesItems = [
  {
    date: '2026.10.04',
    en: 'Homepage rebuilt around conversation: top tabs (Chat / Live Demo / Release Log), original logo restored, larger chat composer, API docs folded into per-workflow admin row actions.',
    zh: '首页重构为「对话主导」：顶部 tab（对话 / 在线演示 / 发布日志）、恢复原版 logo、放大对话输入框、API 文档收敛到工作流管理行内按钮。',
  },
  {
    date: '2026.09.14',
    en: 'Conversation-as-API: DeepSeek-style chat homepage, preview / API docs / call dashboard pages, pluggable Agent architecture and canvas versioning.',
    zh: '对话即 API：DeepSeek 风对话首页、预览 / API 文档 / 调用看板页面、Agent 可插拔架构与画布版本化。',
  },
  {
    date: '2026.08.07',
    en: 'AI Agent GA: sidebar conversation (CreatePlan + step cards), debug info panel per LLM call, agent config center (models, prompts, tools, permissions), session review reuses the chat bubble style with message → debug jump, curl exports with full host URL, session titles support double-click rename.',
    zh: 'AI Agent 正式发布：侧边栏对话（CreatePlan 分步规划 + 执行卡片）、每次 LLM 调用独立调试信息面板、Agent 配置中心（模型、提示词、工具、权限）、会话审查复用侧边栏消息气泡样式并支持消息↔调试跳转、curl 导出链接带完整 host、会话标题支持双击重命名。',
    link: 'https://boommanpro.cn/post/ai-coding-gaia-ai-agent-workflow',
  },
  { date: '2026.07.14', en: 'Rebuilt as Gaia: internationalized homepage, admin console with workflow/template management, version control, multi-condition node synced from official flowgram.ai.', zh: '重建为 Gaia：国际化首页、管理后台（工作流/模板管理）、版本控制、同步官方 multi-condition 节点。' },
  { date: '2026.01.25', en: 'Added admin console with configurable server address.', zh: '增加管理端，右上角可配置自己的服务器地址。' },
  { date: '2026.01.23', en: 'Added Electron desktop app for local experience.', zh: '增加 Electron 端，可直接运行体验。' },
  { date: '2026.01.06', en: 'Merged frontend and backend repositories into one monorepo.', zh: '前后端两个仓库合并。' },
  { date: '2025.12.27', en: 'Upgraded to flowgram.ai v1.0.6, built Vue3 admin demo and server, updated docs.', zh: '跟进官网升级到 v1.0.6，开发 Vue3 管理端 demo 和服务端，更新文档。' },
  { date: '2025.10.17', en: 'Upgraded to flowgram.ai v0.5.5, fixed related code.', zh: '跟进官网升级到 v0.5.5，修复相关代码。' },
  { date: '2025.09.06', en: 'Frontend and backend support for string-format component with SpEL and Thymeleaf syntax.', zh: '前后端支持 string-format 组件，支持 SpEL、Thymeleaf 语法。' },
  { date: '2025.08.22', en: 'Server-side support released.', zh: '服务端支持发布。' },
  { date: '2025.08.20', en: 'Updated to latest official branch, refactored code.', zh: '更新分支到官网最新，重构代码分支。' },
  { date: '2025.05.27', en: 'Refactored codebase, maintained only apps/demo-free-layout directory.', zh: '重构代码分支，仅维护 apps/demo-free-layout 目录。' },
];

export const ReleaseTimeline: React.FC = () => {
  const lang = useLanguage();
  const isZh = lang === 'zh';

  return (
    <div style={{ position: 'relative', paddingLeft: '32px' }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute',
        left: '7px',
        top: '8px',
        bottom: '8px',
        width: '2px',
        background: '#e8e8ea',
      }} />

      {releasesItems.map((item, i) => (
        <div key={i} style={{ position: 'relative', marginBottom: i === releasesItems.length - 1 ? 0 : '28px' }}>
          {/* Dot */}
          <div style={{
            position: 'absolute',
            left: '-32px',
            top: '4px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: i === 0 ? ACCENT : '#fff',
            border: i === 0 ? 'none' : `2px solid ${i === 0 ? ACCENT : '#ccc'}`,
          }} />

          {/* Content */}
          <div
            style={{
              padding: '16px 20px',
              background: i === 0 ? '#f5f5ff' : '#fff',
              border: `1px solid ${i === 0 ? '#e0e0ff' : '#f0f0f2'}`,
              borderRadius: '8px',
              transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: i === 0 ? ACCENT : '#999',
              marginBottom: '6px',
            }}>
              {item.date}
              {i === 0 && (
                <span style={{
                  marginLeft: '8px',
                  padding: '1px 8px',
                  background: ACCENT,
                  color: '#fff',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}>
                  {t('releases.latest')}
                </span>
              )}
            </div>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.6, margin: 0 }}>
              {isZh ? item.zh : item.en}
            </p>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-block',
                  marginTop: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: ACCENT,
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
              >
                {t('releases.readMore')} →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReleaseTimeline;
