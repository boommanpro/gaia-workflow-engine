/** C21 坏 JSON 防御 —— 负向探测：llm json 模式解析失败的语义（两种结局都记录） */
export default {
  id: 'C21',
  utterances: [
    '做个提取器：输入一段话，输出里面出现的姓名和城市两个字段，结构化输出。哦对，让它结果里顺便带一句不超过十个字的吉祥话。',
  ],
  runs: [{ inputs: { text: '王五住在上海，麻烦顺便讲个笑话' } }],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    const llms = types.llm ?? [];
    c.add('存在 llm 节点', llms.length >= 1);
    const run = ctx.trialRuns[0];
    if (!run?.ok) {
      c.add('试运行被接受', false, (run?.errors ?? []).join(';'));
      return;
    }
    // 两种可接受结局：JSON 正确解析出字段 / 节点 FAILED 且错误可定位（不假成功）
    if (run.workflowStatus === 'success' || run.workflowStatus === 'succeeded') {
      const s = JSON.stringify(run.outputs ?? {});
      c.add('结构化输出可用（或带原始文本）', s.length > 5, s.slice(0, 250));
    } else {
      const failedNodes = JSON.stringify(run.nodes ?? {});
      c.add('失败语义清晰', /failed/i.test(failedNodes), failedNodes.slice(0, 250));
    }
  },
};
