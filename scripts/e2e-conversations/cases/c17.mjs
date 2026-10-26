/** C17 折扣计算器 —— 数字类型保真主角 */
export default {
  id: 'C17',
  utterances: [
    '做个折扣计算器：输入单价和数量，总价打 85 折。输出折后总价（保留两位小数）和“省了多少钱”两个金额。注意金额就是数字，别变成文字拼接的那种。',
  ],
  runs: [{ inputs: { price: 20, quantity: 3 } }],
  async verify(h, ctx, c) {
    const run = ctx.trialRuns[0];
    if (!h.runOk(c, run)) return;
    const outs = run.outputs ?? {};
    const nums = [];
    const collect = (v) => {
      if (typeof v === 'number') nums.push(v);
      else if (Array.isArray(v)) v.forEach(collect);
      else if (v && typeof v === 'object') Object.values(v).forEach(collect);
    };
    collect(outs);
        c.add('折后总价 51 且为数字', nums.some((n) => Math.abs(n - 51) < 0.001), h.fmt(outs).slice(0, 200));
        c.add('节省 9 且为数字', nums.some((n) => Math.abs(n - 9) < 0.001), h.fmt(outs).slice(0, 200));
    c.add('无字符串化数字', !/"total"\s*:\s*"/.test(JSON.stringify(outs)) && !/"saved"\s*:\s*"/.test(JSON.stringify(outs)), h.fmt(outs).slice(0, 200));
  },
};
