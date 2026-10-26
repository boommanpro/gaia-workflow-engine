/**
 * 前端画布验证：打开 /chat/<sessionKey>，等画布渲染，断言节点卡片数量与无 Unknown/Undefined 断裂引用。
 * 用法：node frontend-verify.mjs <sessionKey> [label]
 */
import { createRequire } from 'node:module';
const require = createRequire('/Users/boommanpro/trae_project/flowgram-ai-rule-engine/apps/console/package.json');
const { chromium } = require('playwright');
import fs from 'node:fs';

const sessionKey = process.argv[2];
const label = process.argv[3] ?? sessionKey;
if (!sessionKey) {
  console.error('usage: node frontend-verify.mjs <sessionKey> [label]');
  process.exit(1);
}

const CONSOLE_BASE = process.env.CONSOLE_BASE ?? 'http://127.0.0.1:3001';
const OUT = `/tmp/frontend-${label}.png`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));

await page.goto(`${CONSOLE_BASE}/chat/${sessionKey}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
// 等画布渲染（flowgram 节点卡片出现）
await page.waitForTimeout(8000);

const probe = await page.evaluate(() => {
  const bodyText = document.body.innerText;
  const nodeCards = document.querySelectorAll('[data-node-id], .wf-node, [class*="node-render"]');
  const unknownCount = (bodyText.match(/Unknown/g) ?? []).length;
  const undefinedCount = (bodyText.match(/Undefined/g) ?? []).length;
  // 画布容器存在性
  const canvasRoot = !!document.querySelector('[class*="flow-canvas"], [class*="canvas"], [class*="editor"]');
  return {
    title: document.title,
    bodyTextLength: bodyText.length,
    nodeCardCount: nodeCards.length,
    unknownCount,
    undefinedCount,
    canvasRoot,
    snippet: bodyText.slice(0, 400),
  };
});

await page.screenshot({ path: OUT, fullPage: false });

// 进入完整编辑器验证变量徽标
let editorProbe = null;
try {
  const btn = page.getByText('在编辑器中精修', { exact: false }).first();
  await btn.click({ timeout: 8000 });
  await page.waitForTimeout(12000);
  editorProbe = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    return {
      url: location.pathname,
      unknownCount: (bodyText.match(/Unknown/g) ?? []).length,
      undefinedCount: (bodyText.match(/Undefined/g) ?? []).length,
      textLength: bodyText.length,
    };
  });
  await page.screenshot({ path: OUT.replace('.png', '-editor.png'), fullPage: false });
} catch (e) {
  editorProbe = { error: String(e).slice(0, 150) };
}

const checks = [
  { name: '页面加载（正文非空）', pass: probe.bodyTextLength > 200, detail: `len=${probe.bodyTextLength}` },
  { name: '画布根容器存在', pass: probe.canvasRoot },
  { name: '无 Unknown 断裂引用', pass: probe.unknownCount === 0, detail: `Unknown=${probe.unknownCount}` },
  { name: '无 Undefined 断裂引用', pass: probe.undefinedCount === 0, detail: `Undefined=${probe.undefinedCount}` },
];
console.log(JSON.stringify({ sessionKey, label, checks, editorProbe, probe: { ...probe, snippet: probe.snippet.slice(0, 120) }, pageErrors: errors.slice(0, 3), screenshot: OUT }, null, 1));
await browser.close();
process.exit(checks.every((x) => x.pass) ? 0 : 2);
