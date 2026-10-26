/**
 * Markdown - 轻量 Markdown 渲染 + 选项块解析
 * 零依赖，覆盖 assistant 常见输出：标题/段落/列表/加粗/行内代码/代码块/链接/引用/表格/分隔线
 * 同时解析 ::options 选项块，渲染为可点击按钮
 */
import React, { useMemo, useCallback } from 'react';

import { t } from '../i18n';

/** 选项块解析结果 */
export interface ParsedContent {
  /** 去除选项块后的 markdown 文本（可能为空） */
  text: string;
  /** 选项列表（原文输出，点击即发送） */
  options: string[];
}

/**
 * 解析 ::options ... :: 选项块，返回纯文本与选项数组
 * 支持格式：
 *   ::options
 *   - 选项一
 *   - 选项二
 *   ::
 */
export function parseOptions(raw: string): ParsedContent {
  if (!raw) return { text: '', options: [] };
  const options: string[] = [];
  // 匹配 ::options 开头到 :: 结尾的块（跨行）
  const re = /::options\s*\n([\s\S]*?)::\s*(?:\n|$)/g;
  const text = raw.replace(re, (_m, body: string) => {
    // 提取列表项
    const lines = body.split('\n');
    for (const line of lines) {
      const m = line.match(/^\s*[-*]\s+(.+?)\s*$/);
      if (m) options.push(m[1].trim());
    }
    return '';
  });
  return { text: text.replace(/\n{3,}/g, '\n\n').trim(), options };
}

/** 转义 HTML 特殊字符 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 中文模型输出表格常用全角竖线「｜」，GFM 解析只认 ASCII 管道。
 * 行内出现 ≥2 个全角竖线即视作表格行，整行归一成 ASCII 管道。
 */
function normalizeTablePipes(line: string): string {
  return (line.match(/｜/g) || []).length >= 2 ? line.replace(/｜/g, '|') : line;
}

/** 复制按钮里的小图标（dangerouslySetInnerHTML 场景用不了 React 组件，只能内联 SVG 字符串） */
const COPY_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';

/** 行内格式：加粗、行内代码、链接 */
function renderInline(text: string): string {
  let s = escapeHtml(text);
  // 行内代码 `code`
  s = s.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  // 加粗 **text** 或 __text__
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // 斜体 *text* 或 _text_（避免与加粗冲突，要求两侧非空白）
  s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
  // 链接 [text](url)
  s = s.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>'
  );
  return s;
}

/** GFM 分隔行（如 |------|------|）：表格第二行的判定依据 */
const TABLE_SEP_RE = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/;

/** 第 i 行是否为表格起始（含 | 且下一行是分隔行） */
function looksLikeTableStart(lines: string[], i: number): boolean {
  return (
    lines[i].includes('|') &&
    i + 1 < lines.length &&
    TABLE_SEP_RE.test(lines[i + 1]) &&
    lines[i + 1].includes('-') &&
    lines[i + 1].includes('|')
  );
}

/** 将 markdown 文本解析为 HTML 字符串 */
function markdownToHtml(md: string): string {
  if (!md) return '';
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const iterStart = i;
    const line = lines[i];

    // 代码块 ```（带头部：语言标识 + 复制按钮，复制走容器级事件委托）
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++; // 跳过结束 ```
      const copyLabel = t('chat.copyCode');
      html.push(
        `<div class="md-codeblock">` +
          `<div class="md-codeblock-head"><span class="md-code-lang">${escapeHtml(lang || 'text')}</span>` +
          `<button type="button" class="md-cb-copy">${COPY_SVG}<span>${escapeHtml(copyLabel)}</span></button></div>` +
          `<pre><code>${escapeHtml(code.join('\n'))}</code></pre>` +
        `</div>`
      );
      continue;
    }

    // 标题（只按前缀判定，与下方段落循环的守卫同一口径：`(.*)$` 对含 \r/\u2028 的行
    // 会匹配失败而前缀仍匹配，两处不一致曾是主循环不推进 i 的死循环来源）
    const h = line.match(/^(#{1,6})\s+/);
    if (h) {
      const level = h[1].length;
      const headingText = line.slice(h[0].length).replace(/[\r\u2028\u2029].*$/s, '');
      html.push(`<h${level} class="md-h md-h${level}">${renderInline(headingText)}</h${level}>`);
      i++;
      continue;
    }

    // 分隔线
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      html.push('<hr class="md-hr" />');
      i++;
      continue;
    }

    // GFM 表格（当前行含 | 且下一行是分隔线）
    if (looksLikeTableStart(lines, i)) {
      const parseRow = (row: string): string[] =>
        row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

      const headers = parseRow(line);
      i += 2; // 跳过表头和分隔线

      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(parseRow(lines[i]));
        i++;
      }

      const thead = `<thead><tr>${headers.map((h) => `<th>${renderInline(h)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody>`;
      html.push(`<table class="md-table">${thead}${tbody}</table>`);
      continue;
    }

    // 引用块
    if (line.trim().startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      html.push(`<blockquote class="md-quote">${renderInline(quote.join(' '))}</blockquote>`);
      continue;
    }

    // 无序列表
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^\s*[-*+]\s+/, ''))}</li>`);
        i++;
      }
      html.push(`<ul class="md-ul">${items.join('')}</ul>`);
      continue;
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`);
        i++;
      }
      html.push(`<ol class="md-ol">${items.join('')}</ol>`);
      continue;
    }

    // 空行
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 段落（连续非空非特殊行合并；模型输出表格常不带前置空行，合并须在表格起始行断开）
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]) &&
      !lines[i].trim().startsWith('>') &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !looksLikeTableStart(lines, i)
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length > 0) {
      // 软换行先转义再落 <br>：若直接 join('<br/>')，分隔符会被 escapeHtml 转成字面 &lt;br/&gt;
      const rendered = renderInline(para.join('\n')).replace(/\n/g, '<br>');
      html.push(`<p class="md-p">${rendered}</p>`);
    }

    // 防御：任何分支组合导致本轮未推进 i 时强制前进，主循环永不卡死
    if (i === iterStart) i++;
  }

  return html.join('');
}

/** Markdown 渲染组件 */
export interface MarkdownProps {
  content: string;
  /** 选项点击回调（点击即发送该选项文本） */
  onOptionClick?: (option: string) => void;
  /** 是否禁用选项点击（如流式输出中） */
  optionsDisabled?: boolean;
  /**
   * 该轮选项是否已作废（对话已经往后走了）。
   * 作废后不再渲染一排可点按钮，只用一行灰字交代「这里曾有 N 个选项」，
   * 避免多轮澄清后对话里堆出一墙孤立按钮。
   */
  optionsRetired?: boolean;
}

export const Markdown: React.FC<MarkdownProps> = ({
  content,
  onOptionClick,
  optionsDisabled,
  optionsRetired,
}) => {
  // 弱模型偶尔输出 <br/> 而不是换行 —— 统一归一成换行再走解析，
  // 否则正文里会看到字面 <br/> 标签；全角管道表格行同步归一成 ASCII 管道
  const normalized = useMemo(
    () => content.replace(/<br\s*\/?>/gi, '\n').split('\n').map(normalizeTablePipes).join('\n'),
    [content]
  );
  const { text, options } = useMemo(() => parseOptions(normalized), [normalized]);
  const html = useMemo(() => markdownToHtml(text), [text]);

  const handleOption = useCallback(
    (opt: string) => {
      if (!optionsDisabled && !optionsRetired && onOptionClick) onOptionClick(opt);
    },
    [optionsDisabled, optionsRetired, onOptionClick]
  );

  /** 代码块复制：事件委托到 .md-cb-copy，取同块 <pre><code> 的文本。
   *  行内改写按钮文案做反馈（不引 Toast —— live 时间线测试环境禁不起 semi-ui 全量包）。 */
  const handleHtmlClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const btn = (e.target as HTMLElement).closest?.('.md-cb-copy') as HTMLElement | null;
    if (!btn) return;
    const codeEl = btn.closest('.md-codeblock')?.querySelector('pre code');
    const value = codeEl?.textContent ?? '';
    const labelEl = btn.querySelector('span');
    const restore = () => { if (labelEl) labelEl.textContent = t('chat.copyCode'); };
    void navigator.clipboard.writeText(value).then(() => {
      if (labelEl) labelEl.textContent = t('chat.copied');
      setTimeout(restore, 1200);
    }, () => {
      if (labelEl) labelEl.textContent = t('chat.copyFailed');
      setTimeout(restore, 1600);
    });
  }, []);

  return (
    <div className="md-body">
      {html && <div className="md-html" onClick={handleHtmlClick} dangerouslySetInnerHTML={{ __html: html }} />}
      {options.length > 0 && optionsRetired && (
        <div
          style={{
            marginTop: html ? '6px' : 0,
            fontSize: '11px',
            color: '#b0b0ba',
            fontStyle: 'italic',
          }}
        >
          {t('agent.optionsRetired', { count: options.length })}
        </div>
      )}
      {options.length > 0 && !optionsRetired && (
        <div className="md-options" style={{ marginTop: html ? '10px' : 0 }}>
          {options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              className="chat-opt"
              disabled={optionsDisabled}
              onClick={() => handleOption(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Markdown;
