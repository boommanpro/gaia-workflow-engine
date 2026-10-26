/** C23 客户咨询自动应答 —— 综合：llm json 驱动 branches + 布尔产物 */
export default {
  id: 'C23',
  utterances: [
    '做一个客户咨询自动应答：客户发来一段话，先判断想咨询的是“退款”“发货”还是“其他”，再判断情绪是否负面。退款的统一回“已收到您的退款申请，24 小时内处理”；发货的看情绪——负面回“非常抱歉给您带来不便，我们加急处理”，非负面回“您的包裹正在安排发货，请留意物流信息”；其他的一律回“已转人工客服”。最后输出回复文案，和一个“是否需要人工跟进”的标记：退款和“其他”类需要，发货类不需要。',
  ],
  runs: [
    { inputs: { text: '我要退款，你们是骗子' } },
    { inputs: { text: '发货怎么这么慢' } },
    { inputs: { text: '今天天气不错' } },
  ],
  async verify(h, ctx, c) {
    const [refund, ship, other] = ctx.trialRuns;
    if (h.runOk(c, refund, '退款输入')) {
      const s = JSON.stringify(refund.outputs ?? {});
      c.add('退款回复', s.includes('退款申请'), s.slice(0, 250));
    }
    if (h.runOk(c, ship, '发货输入')) {
      const s = JSON.stringify(ship.outputs ?? {});
      c.add('发货回复', /抱歉|发货/.test(s), s.slice(0, 250));
    }
    if (h.runOk(c, other, '其他输入')) {
      const s = JSON.stringify(other.outputs ?? {});
      c.add('转人工回复', s.includes('人工'), s.slice(0, 250));
    }
  },
};
