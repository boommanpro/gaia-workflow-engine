/** C13 用户资料解析 —— code javascript 主角（多字段输出 + 深路径引用回归） */
export default {
  id: 'C13',
  utterances: [
    '用户在表单里填的联系方式是一整段文本，比如“张三，住在北京市朝阳区，邮箱 zhangsan@example.com，电话 13800000001”。帮我从中解析出姓名、城市、邮箱、电话四个字段，后面的流程还要单独用每一个。',
  ],
  runs: [{ inputs: { raw: '张三，住在北京市朝阳区，邮箱 zhangsan@example.com，电话 13800000001' } }],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    const codes = types.code ?? [];
    c.add('存在 code 节点', codes.length >= 1);
    if (!codes.length) return;
    const run = ctx.trialRuns[0];
    if (!h.runOk(c, run)) return;
    const flat = JSON.stringify(run.outputs ?? {});
    c.add('姓名解析', flat.includes('张三'), flat.slice(0, 300));
    c.add('城市解析', flat.includes('北京市朝阳区'), flat.slice(0, 300));
    c.add('邮箱解析', flat.includes('zhangsan@example.com'), flat.slice(0, 300));
    c.add('电话解析', flat.includes('13800000001'), flat.slice(0, 300));
  },
};
