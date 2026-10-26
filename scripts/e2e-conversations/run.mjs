#!/usr/bin/env node
/**
 * 运行一个对话用例：node run.mjs C01
 * 结果写入 results/<caseId>.json，摘要输出到 stdout。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as h from './harness.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, 'results');

const caseId = process.argv[2];
if (!caseId) {
  console.error('usage: node run.mjs <caseId>');
  process.exit(1);
}
const caseMod = await import(`./cases/${caseId.toLowerCase()}.mjs`);
const testCase = caseMod.default;

const c = new h.Checks(caseId);
const t0 = Date.now();

// 可选前置（如 C15 需要先发布一个可复用的工作流）
const setupResult = testCase.setup ? await testCase.setup(h) : undefined;

console.log(`[${caseId}] 创建会话…`);
const sessionKey = await h.createSession(`e2e-${caseId}-${new Date().toISOString().slice(5, 16)}`);
console.log(`[${caseId}] sessionKey=${sessionKey}`);

const turns = [];
let doc = null;
let nudgeSent = false;

for (let i = 0; i < testCase.utterances.length; i++) {
  const msg = testCase.utterances[i];
  console.log(`[${caseId}] 发送第 ${i + 1} 轮话术（${msg.length} 字）…`);
  await h.api('POST', `/api/agent/session/${sessionKey}/run`, { message: msg });
  const done = await h.waitRunDone(sessionKey, {
    maxWaitSec: testCase.maxWaitSec ?? 900,
    onAsk: testCase.onAsk ?? (() => '按你推荐的口径继续，并在回复里说明你采用的假设。'),
  });
  const messages = await h.getMessages(sessionKey);
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  turns.push({
    utterance: msg,
    runStatus: done.status,
    asksAnswered: done.asksAnswered,
    lastAssistant: lastAssistant?.content?.slice(0, 1500) ?? '',
  });
  console.log(`[${caseId}] 第 ${i + 1} 轮结束：${done.status}${done.asksAnswered.length ? `（应答 ${done.asksAnswered.length} 个提问）` : ''}`);
  doc = await h.getDoc(sessionKey);
}

// 草稿空壳（无 end 产出）时允许一次推动：真实用户会催一句「继续完成」
const hasEndOutput = (doc?.nodes ?? []).some(
  (n) => n.type === 'end' && Object.keys(n.data?.inputsValues ?? {}).length > 0,
);
if (!hasEndOutput && testCase.utterances.length === 1 && !nudgeSent) {
  nudgeSent = true;
  console.log(`[${caseId}] 草稿无产出，发送推动语…`);
  await h.api('POST', `/api/agent/session/${sessionKey}/run`, {
    message: '请直接按合理假设完成搭建，自己试运行通过后告诉我结果。',
  });
  const done = await h.waitRunDone(sessionKey, {
    maxWaitSec: testCase.maxWaitSec ?? 900,
    onAsk: testCase.onAsk ?? (() => '按你推荐的口径继续。'),
  });
  turns.push({ utterance: '[推动] 请直接按合理假设完成搭建', runStatus: done.status, asksAnswered: done.asksAnswered, lastAssistant: '' });
  doc = await h.getDoc(sessionKey);
}

// 独立试运行（除非用例声明 skipTrialRun）；inputs 按模型声明的 start 参数名做模糊映射
const trialRuns = [];
if (!testCase.skipTrialRun) {
  const startNode = (doc?.nodes ?? []).find((n) => n.type === 'start');
  const declaredParams = Object.keys(startNode?.data?.outputs?.properties ?? {});
  const aliasMap = testCase.inputAliases ?? {}; // 规范键 -> 模型可能用的参数名数组
  for (const r of testCase.runs ?? []) {
    let mapped = r.inputs ?? {};
    if (declaredParams.length > 0) {
      mapped = {};
      for (const [canonical, value] of Object.entries(r.inputs ?? {})) {
        const candidates = [canonical, ...(aliasMap[canonical] ?? [])];
        const hit = declaredParams.find((p) => candidates.some((cc) => p.toLowerCase() === cc.toLowerCase()))
          ?? declaredParams.find((p) => candidates.some((cc) => p.toLowerCase().includes(cc.toLowerCase())));
        mapped[hit ?? canonical] = value;
      }
    }
    console.log(`[${caseId}] 独立试运行 inputs=${JSON.stringify(mapped).slice(0, 200)}…`);
    const run = await h.runTrial(doc, mapped);
    trialRuns.push(run);
    console.log(`[${caseId}] 试运行 ${run.ok ? `完成 status=${run.workflowStatus}` : `被拒绝: ${(run.errors ?? []).join(';').slice(0, 200)}`}`);
  }
}

const ctx = { sessionKey, doc, turns, trialRuns, messages: await h.getMessages(sessionKey), setup: setupResult };
await testCase.verify(h, ctx, c);

const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
const result = {
  caseId,
  sessionKey,
  elapsedSec: Number(elapsed),
  turns,
  pass: c.failures.length === 0,
  checks: c.items,
  doc,
  trialRuns,
};
fs.mkdirSync(RESULTS_DIR, { recursive: true });
fs.writeFileSync(path.join(RESULTS_DIR, `${caseId}.json`), JSON.stringify(result, null, 2));

const passCount = c.items.filter((x) => x.pass).length;
console.log(`\n[${caseId}] ${c.failures.length === 0 ? '✅ PASS' : '❌ FAIL'} ${passCount}/${c.items.length} 项通过，耗时 ${elapsed}s，session=${sessionKey}`);
for (const f of c.failures) {
  console.log(`  ✗ ${f.name}: ${f.detail.slice(0, 200)}`);
}
process.exit(c.failures.length === 0 ? 0 : 2);
