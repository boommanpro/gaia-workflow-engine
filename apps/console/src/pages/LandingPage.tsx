/**
 * 产品首页（DeepSeek 风）：简洁居中对话入口。
 * 输入即发起一段新对话 → 创建会话并跳转到 /c/:key（AI 工作区），
 * 由工作区自动发送首条消息。这就是「以对话为核心创建 API」的入口。
 *
 * 两个刻意的设计：
 *  1) 顶部导航与预览/文档/看板共用 ContentTopNav —— 这几个页面是同级站点页，
 *     点过去不该像换了个产品；
 *  2) hero 区用固定高度的居中容器 —— 中英文文案行数不同（英文标题两行、中文一行），
 *     不锁高度的话一切换语言整页就会上下跳，输入框被顶走。
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgent } from '../agent';
import { useLanguage, t } from '../i18n';
import { setInitialPrompt } from '../agent/initialPrompt';
import ContentTopNav from '../components/ContentTopNav';

const ACCENT = '#4d53e8';

const EXAMPLES = ['landing.chip1', 'landing.chip2', 'landing.chip3', 'landing.chip4'];

export const LandingPage: React.FC = () => {
  useLanguage();
  const navigate = useNavigate();
  const { createSession } = useAgent();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSend = async () => {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setBusy(true);
    try {
      const key = await createSession();
      // 带上目标会话：工作区只在 URL 落到这个会话时才消费这条消息
      setInitialPrompt(prompt, key);
      navigate(`/c/${key}`);
    } catch {
      // 创建失败也不阻塞输入
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        overflowY: 'auto',
        background: 'radial-gradient(1200px 500px at 50% -10%, #f3f3ff 0%, #ffffff 55%)',
        color: '#1a1a1a',
      }}
    >
      <ContentTopNav active="/" showCta={false} />

      <div className="mx-auto flex max-w-[760px] flex-col items-center px-4">
        {/* Hero：固定高度 + 顶部对齐。
            中英文标题行数不同（英文两行、中文一行），锁高度能保证输入框不动；
            再用顶部对齐（而不是垂直居中）让标题本身也钉在原地 —— 切换语言时
            只有标题下方的留白变化，观感上就是「什么都没动」。 */}
        <div className="flex min-h-[236px] w-full flex-col items-center pt-8 sm:min-h-[276px] sm:pt-12">
          <div
            className="mb-5 rounded-full border border-[#ececff] bg-white px-3 py-1 text-xs font-medium"
            style={{ color: ACCENT }}
          >
            {t('landing.tagline')}
          </div>
          <h1
            className="text-center text-[32px] font-extrabold leading-tight sm:text-[44px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            {t('landing.title')}
          </h1>
          <p className="mt-4 max-w-[560px] text-center text-[15px] leading-relaxed text-[#666] sm:text-base">
            {t('landing.subtitle')}
          </p>
        </div>

        {/* 对话输入框 */}
        <div
          className="w-full rounded-2xl border bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
          style={{ borderColor: '#ececf2' }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('landing.placeholder')}
            rows={3}
            className="w-full resize-none border-0 bg-transparent px-2 py-1 text-[15px] outline-none"
            style={{ color: '#1a1a1a', fontFamily: 'inherit' }}
          />
          <div className="flex items-center justify-between px-1 pt-1">
            <span className="text-[11px] text-[#aaa]">{t('landing.examples')} · Enter ↵</span>
            <button
              onClick={() => void handleSend()}
              disabled={!text.trim() || busy}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-40"
              style={{ background: ACCENT }}
              aria-label={t('landing.send')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M3.4 20.4l17.6-8.4L3.4 3.6l-.1 6.3 12 2.1-12 2.1z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 示例 chips */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((k) => (
            <button
              key={k}
              onClick={() => setText(t(k))}
              className="rounded-full border border-[#eee] bg-white px-3.5 py-1.5 text-[13px] text-[#555] transition-colors hover:border-[#c9c9ff] hover:text-[#4d53e8]"
            >
              {t(k)}
            </button>
          ))}
        </div>
      </div>

      <footer className="mt-[8vh] pb-8 text-center text-xs text-[#bbb]">{t('landing.tagline')}</footer>
    </div>
  );
};

export default LandingPage;
