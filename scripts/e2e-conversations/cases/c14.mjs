/** C14 画布批注 —— comment 主角（多轮：先搭流程再加注释） */
export default {
  id: 'C14',
  utterances: [
    '做个成绩小助手：输入一个 0 到 100 的分数，60 分及以上输出“及格”，否则输出“不及格”，并附上分数本身。',
    '这个流程搭好了，帮我在关键步骤旁边加上说明注释（比如为什么以 60 分为界），让同事打开画布能看懂。另外我想确认：加了注释之后，流程运行会不会受影响？',
  ],
  runs: [{ inputs: { score: 85 } }],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    const comments = types.comment ?? [];
    c.add('添加了 comment 节点', comments.length >= 1, `comment 数量=${comments.length}`);
    if (comments.length) {
      const hasText = comments.some((n) => String(n.data?.title ?? n.data?.content ?? '').trim().length > 0);
      c.add('注释有内容', hasText, h.fmt(comments.map((n) => n.data?.title)));
    }
    c.add('业务结构仍在', (types.start ?? []).length >= 1 && (types.end ?? []).length >= 1);
    const run = ctx.trialRuns[0];
    if (h.runOk(c, run, '加注释后试运行')) {
      const s = JSON.stringify(run.outputs ?? {});
      c.add('85 输出及格', s.includes('及格'), s.slice(0, 200));
    }
  },
};
