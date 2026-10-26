/** C11 脏数据清洗 —— loop + continue 主角 */
export default {
  id: 'C11',
  utterances: [
    '做个清洗工具：输入一批用户提交的电话号码，里面可能混着空的或者写着“待补”的，把有效号码挑出来保留，其余直接跳过，最后给我干净名单。',
  ],
  runs: [{ inputs: { phones: ['13800000001', '', '待补', '13800000002'] } }],
  async verify(h, ctx, c) {
    const loops = h.loopBlocks(ctx.doc);
    c.add('存在 loop 容器', loops.length >= 1);
    if (!loops.length) return;
    const blockTypes = loops[0].blocks.map((b) => b.type);
    c.add('体内含 continue', blockTypes.includes('continue'), h.fmt(blockTypes));
    const run = ctx.trialRuns[0];
    if (!h.runOk(c, run)) return;
    const arrays = [];
    const collect = (v) => {
      if (Array.isArray(v) && v.some((x) => typeof x === 'string')) arrays.push(v);
      else if (v && typeof v === 'object' && !Array.isArray(v)) Object.values(v).forEach(collect);
    };
    collect(run.outputs ?? {});
    const list = arrays.sort((a, b) => b.length - a.length)[0] ?? [];
    c.add('保留 2 个有效号码', list.length === 2 && list.includes('13800000001') && list.includes('13800000002'), h.fmt(run.outputs).slice(0, 300));
    c.add('无效项被剔除', !JSON.stringify(run.outputs ?? {}).includes('待补'), h.fmt(run.outputs).slice(0, 300));
  },
};
