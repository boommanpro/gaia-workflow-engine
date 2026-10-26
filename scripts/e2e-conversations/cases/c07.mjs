/** C07 成绩及格判定 —— condition 主角（gte / key-else 端口） */
export default {
  id: 'C07',
  utterances: [
    '做个成绩小助手：输入一个 0 到 100 的分数，60 分及以上输出“及格”，否则输出“不及格”，并附上分数本身。',
  ],
  runs: [
    { inputs: { score: 85 } },
    { inputs: { score: 59 } },
    { inputs: { score: 60 } },
  ],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    const conds = types.condition ?? [];
    c.add('存在 condition 节点', conds.length >= 1);
    if (conds.length) {
      const condId = conds[0].id;
      const ports = ctx.doc.edges.filter((e) => h.edgeSrc(e) === condId).map((e) => h.edgePort(e));
      c.add('出边端口为 key/else', ports.length >= 2 && ports.every((p) => p && !['true', 'false'].includes(p)), h.fmt(ports));
    }
    const [pass, fail, border] = ctx.trialRuns;
    if (h.runOk(c, pass, '85 分试运行')) {
      const s = JSON.stringify(pass.outputs ?? {});
      c.add('85 输出及格', s.includes('及格') && !s.includes('不及格') && s.includes('85'), s.slice(0, 200));
    }
    if (h.runOk(c, fail, '59 分试运行')) {
      const s = JSON.stringify(fail.outputs ?? {});
      c.add('59 输出不及格', s.includes('不及格') && s.includes('59'), s.slice(0, 200));
    }
    if (h.runOk(c, border, '60 分边界试运行')) {
      const s = JSON.stringify(border.outputs ?? {});
      c.add('60 输出及格（边界含）', s.includes('及格'), s.slice(0, 200));
    }
  },
};
