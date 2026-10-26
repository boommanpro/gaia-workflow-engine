/** C28 舆情小日报 —— 综合：http 拉数据 + 循环内 llm json + 汇总报告 */
export default {
  id: 'C28',
  utterances: [
    '做个舆情小日报：从 https://jsonplaceholder.typicode.com/comments?postId=1 拉一批评论数据，把空评论过滤掉，逐条判断情感倾向，最后生成一份“共 X 条有效评论，负面 Y 条”的汇总报告，并把负面评论原文列出来。',
  ],
  runs: [{ inputs: {} }],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    c.add('存在 http 节点', (types.http ?? []).length >= 1);
    c.add('存在 llm 节点', (types.llm ?? []).length >= 1);
    const run = ctx.trialRuns[0];
    if (!h.runOk(c, run)) return;
    const s = JSON.stringify(run.outputs ?? {});
    c.add('报告含计数', /共\s*\d+\s*条|条有效/.test(s), s.slice(0, 300));
    c.add('报告含负面统计', /负面/.test(s), s.slice(0, 300));
  },
};
