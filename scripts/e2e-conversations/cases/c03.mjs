/** C03 实时天气查询 —— http GET 主角（模板 URL / params / 数字类型输出） */
export default {
  id: 'C03',
  utterances: [
    '做个小工具：给它一个城市的经纬度，它帮我查当前天气，返回温度数值和风速。',
  ],
  runs: [{ inputs: { latitude: 39.9, longitude: 116.4 } }],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    const https = types.http ?? [];
    c.add('存在 http 节点', https.length >= 1);
    if (https.length) {
      const api = https[0].data?.api ?? {};
      c.add('method 为 GET', String(api.method ?? '').toUpperCase() === 'GET', h.fmt(api));
    }
    const run = ctx.trialRuns[0];
    if (!h.runOk(c, run)) return;
    const outs = run.outputs ?? {};
    const numbers = [];
    const collect = (v) => {
      if (typeof v === 'number') numbers.push(v);
      else if (Array.isArray(v)) v.forEach(collect);
      else if (v && typeof v === 'object') Object.values(v).forEach(collect);
    };
    collect(outs);
    c.add('温度为数字且合理', numbers.some((n) => n >= -60 && n <= 60), h.fmt(outs).slice(0, 300));
    c.add('风速为非负数字', numbers.some((n) => n > 0 && n < 200), h.fmt(outs).slice(0, 300));
  },
};
