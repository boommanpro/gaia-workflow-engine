/** C04 Webhook 回显 —— http POST / JSON body / 自定义 header 主角 */
export default {
  id: 'C04',
  utterances: [
    '帮我对接一个回显测试接口：把标题和内容以 JSON 发过去，再带上一个自定义请求头 X-Trace-Id 做链路追踪，最后把接口返回的内容原样给我。',
  ],
  runs: [{ inputs: { title: '上线公告', content: 'v2.0 发布', traceId: 'trace-abc-123' } }],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    const https = types.http ?? [];
    c.add('存在 http 节点', https.length >= 1);
    if (!https.length) return;
    const data = https[0].data ?? {};
    c.add('method 为 POST', String(data.api?.method ?? '').toUpperCase() === 'POST', h.fmt(data.api));
    const dataStr = JSON.stringify(data).toUpperCase();
    c.add('自定义请求头存在', dataStr.includes('X-TRACE-ID'), dataStr.slice(0, 300));
    const run = ctx.trialRuns[0];
    if (!h.runOk(c, run)) return;
    const outs = run.outputs ?? {};
    // 回显体可能是嵌在字符串里的 JSON（unicode 转义），逐层解析后断言
    let echo = null;
    const tryParse = (v) => {
      if (typeof v === 'string' && (v.trim().startsWith('{') || v.trim().startsWith('['))) {
        try {
          return JSON.parse(v);
        } catch {
          return null;
        }
      }
      return v && typeof v === 'object' ? v : null;
    };
    for (const v of Object.values(outs)) {
      const p = tryParse(v);
      if (p && (p.data || p.headers)) echo = p;
    }
    c.add('回显体可解析', !!echo, h.fmt(outs).slice(0, 200));
    if (!echo) return;
    const echoDataStr = typeof echo.data === 'string' ? echo.data : JSON.stringify(echo.data);
    c.add('回显含标题', echoDataStr.includes('上线公告'), echoDataStr.slice(0, 200));
    c.add('回显含内容', echoDataStr.includes('v2.0 发布'), echoDataStr.slice(0, 200));
    const traceHeader = Object.keys(echo.headers ?? {}).find((k) => k.toLowerCase() === 'x-trace-id');
    c.add('自定义请求头已发送', !!traceHeader && String(echo.headers[traceHeader]).length > 0, h.fmt(traceHeader));
  },
};
