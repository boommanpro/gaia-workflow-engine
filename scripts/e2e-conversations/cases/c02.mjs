/** C02 发货通知拼接 —— string-format 主角（考察纯模板不用 AI 生成） */
export default {
  id: 'C02',
  utterances: [
    '我每周要给客户发发货通知，内容基本固定：“亲爱的 {name}，您的订单 {orderNo} 已于 {date} 发出，预计 {days} 天内送达。”做个工具把这几个信息填进去生成最终文案。就是纯文本替换，别浪费 token 让大模型写。',
  ],
  runs: [{ inputs: { name: '李雷', orderNo: 'SO-1001', date: '2026-10-25', days: 3 } }],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    c.add('未滥用 llm', (types.llm ?? []).length === 0, `llm 数量=${(types.llm ?? []).length}`);
    const run = ctx.trialRuns[0];
    if (!h.runOk(c, run)) return;
    const s = JSON.stringify(run.outputs ?? {});
    c.add('姓名替换', s.includes('李雷'), s.slice(0, 200));
    c.add('单号替换', s.includes('SO-1001'), s.slice(0, 200));
    c.add('天数替换无 3.0', s.includes('3') && !/3\.0/.test(s), s.slice(0, 200));
    c.add('无残留占位符', !/\{name\}|\{orderNo\}|\{days\}|\{date\}/.test(s), s.slice(0, 200));
  },
};
