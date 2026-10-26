/** C27 订单处理流水线 —— 超大综合：branches + 循环小计 + 条件 + llm + end 多字段 */
export default {
  id: 'C27',
  utterances: [
    '做一个订单处理流水线：输入客户等级（金卡/银卡/普通）和商品清单（每件有名称、单价、数量）。折扣：普通无折扣、银卡 95 折、金卡 9 折。逐个商品算折后小计，最后汇总订单总额；总额超过 1000 的话，再让 AI 写一句个性化的感谢语附在订单上。输出：每件商品的小计明细、订单总额、折扣说明、感谢语（不够 1000 就给空字符串）。先用金卡、两件商品（键盘 300 元×2、鼠标 100 元×1）试跑。',
  ],
  runs: [
    { inputs: { tier: '金卡', items: [{ name: '键盘', price: 300, quantity: 2 }, { name: '鼠标', price: 100, quantity: 1 }] } },
    { inputs: { tier: '普通', items: [{ name: '显示器', price: 1200, quantity: 1 }] } },
  ],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    c.add('存在分支结构', (types.branches ?? []).length >= 1 || (types.condition ?? []).length >= 2);
    c.add('存在 llm 节点', (types.llm ?? []).length >= 1);
    const [small, big] = ctx.trialRuns;
    if (h.runOk(c, small, '金卡小单')) {
      const s = JSON.stringify(small.outputs ?? {});
      c.add('总额 630', /630/.test(s), s.slice(0, 300));
      c.add('感谢语为空', !/感谢|感谢语非空/.test(s) || /""/.test(s), s.slice(0, 300));
    }
    if (h.runOk(c, big, '普通大单')) {
      const s = JSON.stringify(big.outputs ?? {});
      c.add('总额 1200', /1200/.test(s), s.slice(0, 300));
      c.add('感谢语非空', s.length > 10, s.slice(0, 300));
    }
  },
};
