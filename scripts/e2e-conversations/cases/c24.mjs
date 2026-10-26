/** C24 网页摘要机器人 —— 综合：http 拉取 → llm 摘要（数组类型输出探测） */
export default {
  id: 'C24',
  utterances: [
    '做个读网页的小助手：给它一个网址（先用 https://example.com），把网页内容抓下来，给我一段 100 字以内的内容摘要，再给 3 个关键词标签。',
  ],
  runs: [{ inputs: { url: 'https://example.com' } }],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    c.add('存在 http 节点', (types.http ?? []).length >= 1);
    c.add('存在 llm 节点', (types.llm ?? []).length >= 1);
    const run = ctx.trialRuns[0];
    if (!h.runOk(c, run)) return;
    const s = JSON.stringify(run.outputs ?? {});
    c.add('摘要有内容', s.length > 30, s.slice(0, 250));
  },
};
