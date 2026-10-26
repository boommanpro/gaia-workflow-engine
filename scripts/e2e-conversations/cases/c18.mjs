/** C18 多轮改档不残留 —— update 深合并 / 数组整体替换主角（NC-03 回归） */
export default {
  id: 'C18',
  utterances: [
    '做一个按金额定等级的工具：1000 以内是 C 级，1000 到 5000 是 B 级，5000 以上是 A 级，输入金额输出等级文案（形如“等级：B”）。',
    '分档线改一下：100 以内 C，100 到 1000 是 B，1000 到 5000 新加一档 A，5000 以上算 S，一共四档。',
    '算了，还是回到三档，把三个等级的名字改成 金牌、银牌、铜牌，分档线用最早的。',
  ],
  runs: [
    { inputs: { amount: 3000 } },
    { inputs: { amount: 8000 } },
  ],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    const brs = types.branches ?? [];
    const conds = types.condition ?? [];
    c.add('存在分支结构', brs.length >= 1 || conds.length >= 1);
    if (brs.length) {
      const ids = (brs[0].data?.branches ?? []).map((b) => b.id);
      c.add('最终回到 3 分支（无残留第 4 档）', ids.length === 3, h.fmt(ids));
      const ports = ctx.doc.edges.filter((e) => h.edgeSrc(e) === brs[0].id).map((e) => h.edgePort(e));
      c.add('出边无残留分支端口', ports.every((p) => p === 'else' || ids.includes(p)), h.fmt(ports));
    }
    const [mid, big] = ctx.trialRuns;
    if (h.runOk(c, big, '8000 元（S 档应已删除，回归铜牌/金牌口径）')) {
      const s = JSON.stringify(big.outputs ?? {});
      c.add('无 S 级残留', !s.includes('S') || s.includes('金牌'), s.slice(0, 200));
    }
  },
};
