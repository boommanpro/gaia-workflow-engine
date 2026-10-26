/** C16 报销审批状态机 —— variable 主角（assign 赋值与改写） */
export default {
  id: 'C16',
  utterances: [
    '做一个报销审批小流程：输入金额，默认状态是“待审批”；金额大于 1000 的，状态改成“需主管审批”、审批人记“主管”，否则审批人记“财务”。最后把金额、状态、审批人一起输出。',
  ],
  runs: [
    { inputs: { amount: 1500 } },
    { inputs: { amount: 500 } },
  ],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    c.add('存在 variable 节点', (types.variable ?? []).length >= 1, `variable 数量=${(types.variable ?? []).length}`);
    const [big, small] = ctx.trialRuns;
    if (h.runOk(c, big, '1500 元')) {
      const s = JSON.stringify(big.outputs ?? {});
      c.add('大额走主管', s.includes('需主管审批') && s.includes('主管'), s.slice(0, 300));
    }
    if (h.runOk(c, small, '500 元')) {
      const s = JSON.stringify(small.outputs ?? {});
      c.add('小额走财务', s.includes('财务') && !s.includes('需主管审批'), s.slice(0, 300));
    }
  },
};
