/** C12 销售报表汇总 —— code java/groovy 主角（非 JS 引擎） */
export default {
  id: 'C12',
  utterances: [
    '财务每周给我一张销售额数组，我要一个汇总：总销售额、平均数、最高单、最低单，一次算出来。这个计算逻辑要跑在 JVM 那套脚本引擎上，别用浏览器那套脚本。',
  ],
  runs: [{ inputs: { sales: [100, 250, 80, 320] } }],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    const codes = types.code ?? [];
    c.add('存在 code 节点', codes.length >= 1);
    if (!codes.length) return;
    const lang = codes[0].data?.script?.language;
    c.add('language 为 java/groovy', ['java', 'groovy'].includes(lang), `language=${lang}`);
    const script = String(codes[0].data?.script?.content ?? '');
    c.add('脚本含 execute(Map)', /execute\s*\(\s*Map|Map\s*execute|def execute|execute\(/.test(script), script.slice(0, 150));
    const run = ctx.trialRuns[0];
    if (!h.runOk(c, run)) return;
    const nums = [];
    const collect = (v) => {
      if (typeof v === 'number') nums.push(v);
      else if (Array.isArray(v)) v.forEach(collect);
      else if (v && typeof v === 'object') Object.values(v).forEach(collect);
    };
    collect(run.outputs ?? {});
    const has = (x) => nums.some((n) => Math.abs(n - x) < 0.001);
    c.add('total=750', has(750), h.fmt(run.outputs).slice(0, 300));
    c.add('avg=187.5', has(187.5), h.fmt(run.outputs).slice(0, 300));
    c.add('max=320', has(320), h.fmt(run.outputs).slice(0, 300));
    c.add('min=80', has(80), h.fmt(run.outputs).slice(0, 300));
  },
};
