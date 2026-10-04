/**
 * 产品首页（DeepSeek/OpenAI 风）：Tab 化的入口页。
 *
 *  对话      —— 发起对话 → 创建 API（默认 tab）
 *  在线演示  —— 可交互工作流画布（只读）
 *  发布日志  —— 版本历史时间线
 *
 * 输入即发起一段新对话 → 创建会话并跳转到 /c/:key（AI 工作区），
 * 由工作区自动发送首条消息。这就是「以对话为核心创建 API」的入口。
 *
 * 布局：flex column + 内容区 flex:1，内容不足一屏时 footer 贴底。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgent } from '../agent';
import { agentApi } from '../agent/api';
import type { AgentSession } from '../agent/types';
import { useLanguage, t } from '../i18n';
import { setInitialPrompt } from '../agent/initialPrompt';
import ContentTopNav from '../components/ContentTopNav';
import WorkflowDemoCanvas from '../components/WorkflowDemoCanvas';
import ReleaseTimeline from '../components/ReleaseTimeline';

const ACCENT = '#4d53e8';

const EXAMPLES = ['landing.chip1', 'landing.chip2', 'landing.chip3', 'landing.chip4'];

/** 单条消息最多附带的图片数（与工作区输入框保持一致） */
const MAX_IMAGES = 4;

type TabKey = 'chat' | 'demo' | 'releases';

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'chat', labelKey: 'landing.tabChat' },
  { key: 'demo', labelKey: 'landing.tabDemo' },
  { key: 'releases', labelKey: 'landing.tabReleases' },
];

export const LandingPage: React.FC = () => {
  useLanguage();
  const navigate = useNavigate();
  const { createSession } = useAgent();
  const [tab, setTab] = useState<TabKey>('chat');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // IME 合成期间按回车不应发送（中文候选词未确认）
  const isComposingRef = useRef(false);

  // ---------- 历史对话面板 ----------
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySessions, setHistorySessions] = useState<AgentSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyBoxRef = useRef<HTMLDivElement | null>(null);

  /** 点击外部关闭历史面板 */
  useEffect(() => {
    if (!historyOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (historyBoxRef.current && !historyBoxRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [historyOpen]);

  const toggleHistory = useCallback(async () => {
    if (historyOpen) {
      setHistoryOpen(false);
      return;
    }
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const list = await agentApi.listSessions();
      // 按最近更新排序
      const sorted = [...(list || [])].sort(
        (a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
      setHistorySessions(sorted);
    } catch {
      setHistorySessions([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyOpen]);

  const formatTime = (iso?: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  /** 读取单个 File 为 base64 data URL */
  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  /** 追加图片（最多 4 张），供选择 / 粘贴 / 拖拽共用 */
  const addImageFiles = useCallback(async (files: File[]) => {
    const picked = files.filter((f) => f.type.startsWith('image/'));
    if (picked.length === 0) return;
    const dataUrls = await Promise.all(picked.map(readFileAsDataURL));
    setImages((prev) => [...prev, ...dataUrls].slice(0, MAX_IMAGES));
  }, []);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    void addImageFiles(Array.from(e.target.files ?? []));
    // 清空以便重复选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** 粘贴时识别剪贴板中的图片 */
  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const f = items[i].getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length === 0) return;
    e.preventDefault();
    void addImageFiles(files);
  };

  const handleSend = async () => {
    const prompt = text.trim();
    if ((!prompt && images.length === 0) || busy) return;
    setBusy(true);
    try {
      const key = await createSession();
      // 带上目标会话：工作区只在 URL 落到这个会话时才消费这条消息
      setInitialPrompt(prompt, key, images.length > 0 ? images : undefined);
      navigate(`/c/${key}`);
    } catch {
      // 创建失败也不阻塞输入
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(1200px 500px at 50% -10%, #f3f3ff 0%, #ffffff 55%)',
        color: '#1a1a1a',
      }}
    >
      <ContentTopNav
        active="/"
        showCta={false}
        tabs={TABS}
        activeTab={tab}
        onTabChange={(key) => setTab(key as TabKey)}
      />

      {/* 内容区：flex:1，撑满剩余空间让 footer 贴底 */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* ---------- 对话 tab：居中经典式 ---------- */}
        {tab === 'chat' && (
          <div className="mx-auto flex w-full max-w-[980px] flex-1 flex-col items-center px-6 pt-10 pb-16 sm:px-10">
            <h1
              className="text-center font-extrabold leading-tight"
              style={{ letterSpacing: '-0.02em', fontSize: 'clamp(28px, 3.4vw, 48px)' }}
            >
              {t('landing.title')}
            </h1>
            <p
              className="mt-4 max-w-[720px] text-center leading-relaxed text-[#666]"
              style={{ fontSize: 'clamp(15px, 1.1vw, 17px)' }}
            >
              {t('landing.subtitle')}
            </p>

            {/* 大输入框：支持图片（点击选择 / 粘贴 / 拖拽），四周留出内边距 */}
            <div
              className="mt-10 w-full rounded-[26px] border bg-white p-6 shadow-[0_14px_44px_rgba(0,0,0,0.08)] transition-colors"
              style={{ borderColor: dragOver ? ACCENT : '#e8e8f0' }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!dragOver) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void addImageFiles(Array.from(e.dataTransfer.files));
              }}
            >
              {images.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-3 px-1">
                  {images.map((src, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={src}
                        alt=""
                        className="h-20 w-20 rounded-xl object-cover"
                        style={{ border: '1px solid #ececf2' }}
                      />
                      <button
                        onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-white"
                        style={{ background: '#3a3a42' }}
                        aria-label={t('landing.removeImage')}
                        title={t('landing.removeImage')}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                          <path d="M5 5l14 14M19 5L5 19" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                onCompositionStart={() => { isComposingRef.current = true; }}
                onCompositionEnd={() => { isComposingRef.current = false; }}
                placeholder={t('landing.placeholder')}
                rows={10}
                className="w-full resize-none border-0 bg-transparent px-2 py-2 text-[17px] leading-relaxed outline-none"
                style={{ color: '#1a1a1a', fontFamily: 'inherit' }}
              />

              <div className="flex items-center justify-between px-2 pb-1 pt-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:border-[#c9c9ff] hover:text-[#4d53e8]"
                    style={{ borderColor: '#ececf2', color: '#666' }}
                    title={t('landing.attach')}
                    aria-label={t('landing.attach')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="9" cy="9" r="1.6" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </button>

                  {/* 历史对话：查看 / 跳转历史会话 */}
                  <div className="relative" ref={historyBoxRef}>
                    <button
                      onClick={() => void toggleHistory()}
                      className="flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors hover:border-[#c9c9ff] hover:text-[#4d53e8]"
                      style={{ borderColor: historyOpen ? ACCENT : '#ececf2', color: historyOpen ? ACCENT : '#666' }}
                      title={t('landing.history')}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                      {t('landing.history')}
                    </button>

                    {historyOpen && (
                      <div
                        className="absolute left-0 top-[calc(100%+8px)] z-30 w-[340px] overflow-hidden rounded-2xl border bg-white shadow-[0_16px_44px_rgba(0,0,0,0.14)]"
                        style={{ borderColor: '#eee' }}
                      >
                        <div className="border-b px-4 py-3 text-[13px] font-semibold" style={{ borderColor: '#f0f0f2', color: '#333' }}>
                          {t('landing.history')}
                        </div>
                        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                          {historyLoading ? (
                            <div className="px-4 py-8 text-center text-[13px] text-[#999]">{t('Loading')}</div>
                          ) : historySessions.length === 0 ? (
                            <div className="px-4 py-8 text-center text-[13px] text-[#999]">{t('landing.historyEmpty')}</div>
                          ) : (
                            historySessions.map((s) => (
                              <button
                                key={s.sessionKey}
                                onClick={() => {
                                  setHistoryOpen(false);
                                  navigate(`/c/${s.sessionKey}`);
                                }}
                                className="block w-full px-4 py-2.5 text-left transition-colors hover:bg-[#f7f7fb]"
                              >
                                <div className="truncate text-[13.5px] text-[#1a1a1a]">{s.title || s.sessionKey}</div>
                                <div className="mt-0.5 text-[11.5px] text-[#aaa]">{formatTime(s.updatedAt || s.createdAt)}</div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-[12px] text-[#aaa]">
                    {images.length > 0 ? `${images.length}/${MAX_IMAGES}` : t('landing.examples')} · Enter ↵
                  </span>
                </div>
                <button
                  onClick={() => void handleSend()}
                  disabled={(!text.trim() && images.length === 0) || busy}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
                  style={{ background: ACCENT }}
                  aria-label={t('landing.send')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M3.4 20.4l17.6-8.4L3.4 3.6l-.1 6.3 12 2.1-12 2.1z" />
                  </svg>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onPickFiles}
                style={{ display: 'none' }}
              />
            </div>

            {/* 示例 chips */}
            <div className="mt-7 flex flex-wrap justify-center gap-2.5">
              {EXAMPLES.map((k) => (
                <button
                  key={k}
                  onClick={() => setText(t(k))}
                  className="rounded-full border border-[#eee] bg-white px-4 py-2 text-[13px] text-[#555] transition-colors hover:border-[#c9c9ff] hover:text-[#4d53e8]"
                >
                  {t(k)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------- 在线演示 tab ---------- */}
        {tab === 'demo' && (
          <div className="mx-auto w-full px-5 py-5 sm:px-8">
            <div className="mb-4 text-center">
              <h2 className="text-[26px] font-bold sm:text-[34px]" style={{ letterSpacing: '-0.02em' }}>
                {t('landing.demoTitle')}
              </h2>
              <p className="mt-2 text-[15px] text-[#666]">{t('landing.demoSubtitle')}</p>
            </div>
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0f0f2' }}>
              <WorkflowDemoCanvas height="clamp(560px, calc(100vh - 260px), 1000px)" />
            </div>
          </div>
        )}

        {/* ---------- 发布日志 tab：单列，标题区 + 时间线 ---------- */}
        {tab === 'releases' && (
          <div className="mx-auto w-full max-w-[1120px] px-6 py-10 sm:px-10">
            <div className="mb-8 border-b pb-6" style={{ borderColor: '#eee' }}>
              <h2 className="text-[26px] font-bold sm:text-[32px]" style={{ letterSpacing: '-0.02em' }}>
                {t('releases.title')}
              </h2>
              <p className="mt-2 text-[15px] text-[#666]">{t('releases.subtitle')}</p>
            </div>
            <ReleaseTimeline />
          </div>
        )}
      </main>

      <footer className="py-8 text-center text-xs text-[#bbb]">
        © 2026 Gaia · {t('landing.footer')}
      </footer>
    </div>
  );
};

export default LandingPage;
