/** C29 回归用例沉淀与防改坏 —— test_case / run tests / 证据过期（NC-07）主角 */
export default {
  id: 'C29',
  utterances: [
    '给这个成绩判定流程沉淀 3 个测试用例：85 分应该输出及格、59 分应该输出不及格、60 分应该输出及格（边界）。存好后把用例全部跑一遍告诉我结果。',
    '我把及格线从 60 改成 90，改完把这些用例全部重新跑一遍，告诉我哪些用例的结果变了。',
  ],
  runs: [{ inputs: { score: 85 } }],
  async verify(h, ctx, c) {
    const allMsgs = JSON.stringify(ctx.messages ?? []);
    c.add('用例已创建', /caseId|用例已创建|test_case|用例/.test(allMsgs), '会话中未发现用例沉淀痕迹');
    c.add('第一轮全量跑过', /用例.*(通过|全.*绿|3\s*\/\s*3)|results/.test(allMsgs) || /全部(通过|成功)/.test(allMsgs), allMsgs.slice(-300));
    c.add('改阈值后重跑并报告变化', /不及格|变了|失败|回归|60/.test(allMsgs), allMsgs.slice(-400));
    const run = ctx.trialRuns[0];
    if (h.runOk(c, run, '90 分线下的 85 分')) {
      const s = JSON.stringify(run.outputs ?? {});
      c.add('85 分现在不及格', s.includes('不及格'), s.slice(0, 200));
    }
  },
};
