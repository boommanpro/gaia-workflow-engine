/** C05 广告文案润色 —— llm text 主角（systemPrompt/temperature/凭证三件套） */
export default {
  id: 'C05',
  utterances: [
    '我有一段产品介绍文字，每次发出去之前想让它更有感染力一点。做个工具：输入原文，输出润色后的版本。风格商务但带点热情，别太夸张，每次产出要稳定。',
  ],
  runs: [{ inputs: { text: '这款保温杯容量500毫升，不锈钢内胆。' } }],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    const llms = types.llm ?? [];
    c.add('存在 llm 节点', llms.length >= 1);
    if (!llms.length) return;
    const iv = llms[0].data?.inputsValues ?? {};
    const val = (k) => {
      const v = iv[k];
      return v && typeof v === 'object' ? v.content : v;
    };
    c.add('modelName 已填', !!val('modelName'), h.fmt(val('modelName')));
    c.add('apiHost 已填', !!val('apiHost'), h.fmt(val('apiHost')));
    c.add('apiKey 已填', !!val('apiKey'), '已填=' + !!val('apiKey'));
    const promptContent = iv.prompt?.content ?? iv.prompt ?? '';
    c.add('prompt 引用上游 start', /start/i.test(JSON.stringify(promptContent)), String(promptContent).slice(0, 120));
    const run = ctx.trialRuns[0];
    if (!h.runOk(c, run)) return;
    const values = Object.values(run.outputs ?? {});
    const result = values.find((v) => typeof v === 'string');
    c.add('产出润色文本', typeof result === 'string' && result.length > 20 && result !== '这款保温杯容量500毫升，不锈钢内胆。', String(result).slice(0, 150));
  },
};
