/** C15 子流程复用 —— workflow 主角（前置：用 /save 发布成绩判定流程） */
export default {
  id: 'C15',
  async setup(h) {
    // 先建一个会话生成成绩判定工作流并落版，给子流程复用提供目标
    const key = await h.createSession(`e2e-C15-publisher-${Date.now().toString().slice(-6)}`);
    await h.api('POST', `/api/agent/session/${key}/run`, {
      message: '做个成绩小助手：输入一个 0 到 100 的分数，60 分及以上输出“及格”，否则输出“不及格”，并附上分数本身。输入用 85 试跑一次。',
    });
    await h.waitRunDone(key, { maxWaitSec: 600 });
    const doc = await h.getDoc(key);
    const save = await h.api('POST', `/api/agent/session/${key}/save`, { name: '成绩判定器', versionDesc: 'e2e C15 前置发布' });
    return { publisherSession: key, doc, save };
  },
  utterances: [
    '我之前发布过一个“成绩判定器”的工作流。现在做一个新工具：输入一个分数，先复用之前那个判定器拿到结果文案，再把结果文案原样输出给我。',
  ],
  runs: [{ inputs: { score: 85 } }],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    const subs = types.workflow ?? [];
    c.add('存在子流程节点', subs.length >= 1);
    if (subs.length) {
      c.add('workflowId 已填', !!subs[0].data?.workflowId, h.fmt(subs[0].data?.workflowId));
    }
    const run = ctx.trialRuns[0];
    if (!h.runOk(c, run)) return;
    const s = JSON.stringify(run.outputs ?? {});
    c.add('复用结果输出', s.includes('及格') && s.includes('85'), s.slice(0, 300));
  },
};
