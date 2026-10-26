/** C06 客服工单智能分诊 —— llm json 结构化输出主角 */
export default {
  id: 'C06',
  utterances: [
    '客服每天收到很多工单，我想先自动打标：输入一条工单描述，输出三个东西——情感倾向（positive/neutral/negative）、问题类别（账务/物流/产品/其他）、紧急程度（1-5 的数字）。后面的同事要按这几个标签分派。',
  ],
  runs: [
    { inputs: { text: '我的订单三天了还没发货，再不发货就投诉！' } },
    { inputs: { text: '你们的产品真棒，物流也快，谢谢！' } },
  ],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    const llms = types.llm ?? [];
    c.add('存在 llm 节点', llms.length >= 1);
    if (llms.length) {
      c.add('outputMode=json', llms[0].data?.outputMode === 'json', `outputMode=${llms[0].data?.outputMode}`);
      const declared = Object.keys(llms[0].data?.outputs?.properties ?? {});
      const labelKey = declared.includes('priority') ? 'priority' : (declared.includes('urgency') ? 'urgency' : null);
      c.add('声明了 sentiment/category/紧急度', declared.includes('sentiment') && declared.includes('category') && labelKey != null, h.fmt(declared));
    }
    const [neg, pos] = ctx.trialRuns;
    if (h.runOk(c, neg, '负面工单试运行') && neg) {
      const s = JSON.stringify(neg.outputs ?? {});
      c.add('负向识别', /negative/i.test(s), s.slice(0, 300));
      const nums = [];
      JSON.stringify(neg.outputs, (k, v) => {
        if (typeof v === 'number') nums.push(v);
        return v;
      });
      c.add('紧急度为数字', nums.some((n) => n >= 1 && n <= 5), h.fmt(nums));
    }
    if (h.runOk(c, pos, '正面工单试运行') && pos) {
      const s = JSON.stringify(pos.outputs ?? {});
      c.add('正向识别', /positive/i.test(s), s.slice(0, 300));
    }
  },
};
