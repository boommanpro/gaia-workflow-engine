/** C01 活动报名信息卡 —— start/end 主角（话术红线：不点节点名） */
export default {
  id: 'C01',
  utterances: [
    '帮我做一个活动报名的信息卡工具：提交姓名、年龄和邮箱，跑完输出一张卡片——姓名、邮箱原样带上，再拼一句“欢迎张三，今年 28 岁”这样的问候语。',
  ],
  runs: [{ inputs: { name: '张三', age: 28, email: 'z@x.com' } }],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    c.add('草稿存在 end 且有产出', (types.end ?? []).some((n) => Object.keys(n.data?.inputsValues ?? {}).length > 0));
    c.add('未滥用 llm', (types.llm ?? []).length === 0, `llm 数量=${(types.llm ?? []).length}`);
    const run = ctx.trialRuns[0];
    if (!h.runOk(c, run)) return;
    const outs = run.outputs ?? {};
    c.add('outputs.name 原样', outs.name === '张三', h.fmt(outs.name));
    c.add('outputs.email 原样', outs.email === 'z@x.com', h.fmt(outs.email));
    const greeting = Object.values(outs).find((v) => typeof v === 'string' && v.includes('张三') && !/z@x\.com/.test(v));
    c.add('问候语含姓名与年龄', typeof greeting === 'string' && greeting.includes('张三') && /28/.test(greeting), h.fmt(greeting));
    c.add('数字渲染无 28.0', typeof greeting !== 'string' || !greeting.includes('28.0'), h.fmt(greeting));
  },
};
