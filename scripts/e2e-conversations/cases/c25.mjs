/** C25 年会邀请函批量生成 —— loop 内对象字段访问 + 聚合保序（模板化理由引导） */
export default {
  id: 'C25',
  utterances: [
    '公司年会要发邀请函：给一份嘉宾名单（每人有姓名和公司两项信息），名单是：张三（A科技）、李四（B集团）。每位嘉宾单独生成一封“尊敬的 {name}（{company}），诚邀您出席 2026 年会”。注意：文案模板是我们市场部维护的，会经常改，所以不要把文案写死在代码里，用模板能力逐位生成。最后把所有邀请函按名单顺序合成一个列表输出。',
  ],
  runs: [{ inputs: { guests: [{ name: '张三', company: 'A科技' }, { name: '李四', company: 'B集团' }] } }],
  async verify(h, ctx, c) {
    const loops = h.loopBlocks(ctx.doc);
    c.add('存在 loop 容器', loops.length >= 1);
    const run = ctx.trialRuns[0];
    if (!h.runOk(c, run)) return;
    const arrays = [];
    const collect = (v) => {
      if (Array.isArray(v) && v.some((x) => typeof x === 'string')) arrays.push(v);
      else if (v && typeof v === 'object' && !Array.isArray(v)) Object.values(v).forEach(collect);
    };
    collect(run.outputs ?? {});
    const list = arrays.sort((a, b) => b.length - a.length)[0] ?? [];
    c.add('2 封邀请函', list.length === 2, h.fmt(run.outputs).slice(0, 300));
    c.add('顺序与字段正确', String(list[0]).includes('张三') && String(list[0]).includes('A科技')
      && String(list[1]).includes('李四') && String(list[1]).includes('B集团'), h.fmt(list).slice(0, 300));
  },
};
