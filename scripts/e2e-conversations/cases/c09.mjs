/** C09 商品创意标语逐条生成 —— loop 容器主角（体节点 llm + 逐轮聚合，code 单节点做不到） */
export default {
  id: 'C09',
  utterances: [
    '我有一份商品名单：键盘、鼠标、显示器。做一个工具，输入这样的名单数组，名单里每个商品都单独让 AI 想一句有创意、不重样的促销标语——这是逐条创作，不是套模板替换。最后把所有标语按名单顺序合成一个列表给我。',
  ],
  runs: [{ inputs: { items: ['键盘', '鼠标', '显示器'] } }],
  async verify(h, ctx, c) {
    const loops = h.loopBlocks(ctx.doc);
    c.add('存在 loop 容器', loops.length >= 1);
    if (!loops.length) return;
    const loop = loops[0];
    const blockTypes = loop.blocks.map((b) => b.type);
    c.add('DSL 含 block-start', blockTypes.includes('block-start'), h.fmt(blockTypes));
    c.add('DSL 含 block-end', blockTypes.includes('block-end'), h.fmt(blockTypes));
    c.add('loopFor 引用上游数组', JSON.stringify(loop.loopFor ?? {}).length > 10, h.fmt(loop.loopFor));
    const bodyStr = JSON.stringify(loop.blocks);
    c.add('体内引用 item', bodyStr.includes('_locals.item') || bodyStr.includes('loop.item'), bodyStr.slice(0, 300));
    c.add('loopOutputs 已配置聚合', loop.loopOutputs && Object.keys(loop.loopOutputs).length >= 1, h.fmt(loop.loopOutputs));
    const run = ctx.trialRuns[0];
    if (!h.runOk(c, run)) return;
    const arrays = [];
    const collect = (v) => {
      if (Array.isArray(v) && v.some((x) => typeof x === 'string')) arrays.push(v);
      else if (v && typeof v === 'object' && !Array.isArray(v)) Object.values(v).forEach(collect);
    };
    collect(run.outputs ?? {});
    const slogans = arrays.sort((a, b) => b.length - a.length)[0] ?? [];
    c.add('聚合 3 条标语', slogans.length === 3, h.fmt(run.outputs).slice(0, 400));
    c.add('逐条非空且互不相同', slogans.length === 3 && new Set(slogans).size === 3 && slogans.every((s) => String(s).length >= 4), h.fmt(slogans));
  },
};
