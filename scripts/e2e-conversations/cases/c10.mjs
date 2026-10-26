/** C10 库存预警扫描 —— loop + break 主角 */
export default {
  id: 'C10',
  utterances: [
    '做个库存扫描器：输入一串商品记录（名字和库存数量），按顺序检查，一旦发现任何一个库存为 0 的商品就立刻停下来，输出它的名字和它是第几个；如果一个都没有，就输出“全部有货”。',
  ],
  runs: [
    { inputs: { records: [{ name: 'A', stock: 5 }, { name: 'B', stock: 0 }, { name: 'C', stock: 3 }] } },
    { inputs: { records: [{ name: 'A', stock: 5 }, { name: 'B', stock: 2 }] } },
  ],
  async verify(h, ctx, c) {
    const loops = h.loopBlocks(ctx.doc);
    c.add('存在 loop 容器', loops.length >= 1);
    if (!loops.length) return;
    const blockTypes = loops[0].blocks.map((b) => b.type);
    c.add('体内含 break', blockTypes.includes('break'), h.fmt(blockTypes));
    const [hit, allOk] = ctx.trialRuns;
    if (h.runOk(c, hit, '命中场景')) {
      const s = JSON.stringify(hit.outputs ?? {});
      c.add('命中 B', s.includes('B'), s.slice(0, 300));
      c.add('序号为第 2 个', /["':]2["']?|第2|第 2|index[^0-9]*2/.test(s) || /2/.test(s), s.slice(0, 300));
    }
    if (h.runOk(c, allOk, '全部有货场景')) {
      const s = JSON.stringify(allOk.outputs ?? {});
      c.add('输出全部有货', s.includes('全部有货'), s.slice(0, 300));
    }
  },
};
