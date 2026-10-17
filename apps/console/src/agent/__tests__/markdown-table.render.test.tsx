/**
 * Markdown 渲染契约测试（jsdom）：表格解析的回归钉子。
 *
 * 背景（2026-10-17 对话重构）：中文模型输出表格时经常不带前置空行，
 * 旧版段落合并会把整个表格吞进一个 <p>（管道符糊成一行字）。
 * 契约：紧跟在段落文字后的 GFM 表格必须渲染成 <table>，不依赖前置空行；
 * 全角竖线「｜」表格同样要能解析。
 */
import { describe, expect, it } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';

import Markdown from '../Markdown';

let container: HTMLElement;
let root: Root | null = null;

function renderMd(content: string): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<Markdown content={content} />);
  });
}

describe('Markdown 表格解析', () => {
  it('无前置空行的表格（紧跟段落文字）渲染为 table', () => {
    renderMd('核心参数\n| 参数 | 类型 | 说明 |\n|------|------|------|\n| modelName | string | 模型名称 |\n| apiKey | string | 密钥 |');
    expect(container.querySelector('table.md-table')).not.toBeNull();
    expect(container.querySelectorAll('thead th').length).toBe(3);
    expect(container.querySelectorAll('tbody tr').length).toBe(2);
    // 表格行不能漏进段落
    const paras = Array.from(container.querySelectorAll('p'));
    expect(paras.some((p) => p.textContent?.includes('|------'))).toBe(false);
  });

  it('全角竖线表格归一成 ASCII 后解析', () => {
    renderMd('｜ 参数 ｜ 类型 ｜ 说明 ｜\n｜------｜------｜------｜\n｜ modelName ｜ string ｜ 模型名称 ｜');
    expect(container.querySelector('table.md-table')).not.toBeNull();
  });

  it('带前置空行的常规表格不受影响', () => {
    renderMd('说明：\n\n| a | b |\n|---|---|\n| 1 | 2 |');
    expect(container.querySelector('table.md-table')).not.toBeNull();
  });
});
