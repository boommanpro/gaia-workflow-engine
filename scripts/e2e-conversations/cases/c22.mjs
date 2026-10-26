/** C22 超时与重试 —— timeout/retryTimes 生效探测（独立会话版） */
export default {
  id: 'C22',
  utterances: [
    '做个慢接口探测工具：请求 http://httpbin.org/delay/5（它会拖 5 秒才响应），给我配置单次最多等 3 秒、失败自动重试 2 次的保护，然后试跑一次，我要看到它按配置失败。',
  ],
  runs: [],
  skipTrialRun: true,
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    const https = types.http ?? [];
    c.add('存在 http 节点', https.length >= 1);
    if (!https.length) return;
    const timeout = https[0].data?.timeout;
    c.add('timeout=3000 已配置', timeout?.timeout === 3000, h.fmt(timeout));
    c.add('retryTimes=2 已配置', timeout?.retryTimes === 2, h.fmt(timeout));
    const allMsgs = JSON.stringify(ctx.messages ?? []);
    const sawTimeout = /超时|timeout|timed out|Timeout/i.test(allMsgs);
    c.add('试跑呈现超时失败', sawTimeout, '未发现超时表述');
    c.add('无假成功', !/整流试跑通过/.test(allMsgs));
  },
};
