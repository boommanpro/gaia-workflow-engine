/** C19 称呼兜底 —— condition is_empty + 缺参防守主角 */
export default {
  id: 'C19',
  utterances: [
    '做个称呼生成器：输入名字，输出“{名字}您好”。名字有时候会漏填，漏填的时候统一叫“朋友”。',
  ],
  runs: [
    { inputs: { name: '王先生' } },
    { inputs: { name: '' } },
    { inputs: {} },
  ],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    c.add('存在分支判断', (types.condition ?? []).length >= 1 || (types.branches ?? []).length >= 1 || (types.code ?? []).length >= 1);
    const [named, empty, missing] = ctx.trialRuns;
    if (h.runOk(c, named, '有名字')) {
      c.add('正常称呼含名字', JSON.stringify(named.outputs ?? {}).includes('王先生'), h.fmt(named.outputs).slice(0, 200));
    }
    if (h.runOk(c, empty, '空名字')) {
      c.add('空名兜底', JSON.stringify(empty.outputs ?? {}).includes('朋友'), h.fmt(empty.outputs).slice(0, 200));
    }
    if (h.runOk(c, missing, '缺参')) {
      c.add('缺参不炸', JSON.stringify(missing.outputs ?? {}).includes('朋友'), h.fmt(missing.outputs).slice(0, 200));
    }
  },
};
