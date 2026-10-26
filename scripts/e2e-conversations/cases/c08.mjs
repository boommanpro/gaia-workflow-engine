/** C08 快递费分档计价 —— branches 主角（switch-case + else；考察 ask_user 澄清口径） */
export default {
  id: 'C08',
  utterances: [
    '我们按重量收快递费：1 公斤以内 8 块，1 到 5 公斤每公斤 6 块，5 公斤以上每公斤 4 块，另外每单再收 2 块包装费。做个算价工具：输入重量，输出运费金额，还要给一条档位说明——轻件、标准件、重件优惠三种说法。',
  ],
  onAsk: () =>
    '口径这样定：8/6/4 都是纯运费，2 块包装费所有档位都要加。按这个口径做，不用再问了。',
  runs: [
    { inputs: { weight: 0.5 } },
    { inputs: { weight: 3 } },
    { inputs: { weight: 7 } },
  ],
  async verify(h, ctx, c) {
    const types = h.nodesByType(ctx.doc);
    const brs = types.branches ?? [];
    c.add('存在 branches 节点', brs.length >= 1);
    if (!brs.length) return;
    const br = brs[0];
    const branchIds = (br.data?.branches ?? []).map((b) => b.id);
    c.add('分支数 ≥3', branchIds.length >= 3, h.fmt(branchIds));
    const ports = ctx.doc.edges.filter((e) => h.edgeSrc(e) === br.id).map((e) => h.edgePort(e));
    c.add('出边端口为分支 id 或 else', ports.length >= 2 && ports.every((p) => p === 'else' || branchIds.includes(p)), h.fmt(ports));
    const expectations = [
      { fee: 10, kw: '轻', label: '0.5kg' },
      { fee: 20, kw: '标准', label: '3kg' },
      { fee: 30, kw: '重', label: '7kg' },
    ];
    ctx.trialRuns.forEach((run, i) => {
      const exp = expectations[i];
      if (!exp) return;
      if (!h.runOk(c, run, `${exp.label} 试运行`)) return;
      const outs = run.outputs ?? {};
      const nums = [];
      const strs = [];
      const collect = (v) => {
        if (typeof v === 'number') nums.push(v);
        else if (typeof v === 'string') strs.push(v);
        else if (Array.isArray(v)) v.forEach(collect);
        else if (v && typeof v === 'object') Object.values(v).forEach(collect);
      };
      collect(outs);
      c.add(`${exp.label} 金额=${exp.fee}`, nums.some((n) => Math.abs(n - exp.fee) < 0.001), h.fmt(outs).slice(0, 300));
      c.add(`${exp.label} 档位文案含“${exp.kw}”`, strs.some((x) => x.includes(exp.kw)), h.fmt(outs).slice(0, 300));
    });
  },
};
