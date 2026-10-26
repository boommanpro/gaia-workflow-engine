/** C30 交付前体检与自修复 —— 引用巡检 / 断裂修复（DANGLING_REF 协议）主角 */
export default {
  id: 'C30',
  utterances: [
    '做一个简单可靠的订单金额计算器：输入单价和数量，输出总价（单价×数量）和一件的单价。搭好试跑一遍。',
    '我改主意了：把“单价”这个输出去掉，只保留总价，并且确保整个流程没有引用到已删除的内容，跑一遍确认没问题。',
  ],
  runs: [
    { inputs: { price: 20, quantity: 3 } },
    { inputs: { price: 20, quantity: 3 } },
  ],
  async verify(h, ctx, c) {
    const [r1, r2] = ctx.trialRuns;
    if (h.runOk(c, r1, '首轮')) {
      const s = JSON.stringify(r1.outputs ?? {});
      c.add('总价 60', /60/.test(s), s.slice(0, 200));
    }
    if (h.runOk(c, r2, '删字段后')) {
      const s = JSON.stringify(r2.outputs ?? {});
      c.add('总价仍 60', /60/.test(s), s.slice(0, 200));
    }
    const docStr = JSON.stringify(ctx.doc ?? {});
    c.add('无断裂引用', !/DANGLING/.test(docStr), '草稿结构层面无断裂标记');
  },
};
