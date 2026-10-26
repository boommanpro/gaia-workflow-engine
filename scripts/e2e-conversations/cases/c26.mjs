/** C26 班级签到表 —— 嵌套 loop 能力探测（两种结局都记录） */
export default {
  id: 'C26',
  utterances: [
    '我有班级名单：一班是 小明、小红，二班是 小刚。帮我生成签到表：按班分组，每个班下面列出“班级名-学生名”的签到行，最后输出按班级分组的完整名单。输入参数设计成班级数组（每个班级含名称和学生数组），方便以后换名单。',
  ],
  runs: [{ inputs: { classes: [{ name: '一班', students: ['小明', '小红'] }, { name: '二班', students: ['小刚'] }] } }],
  async verify(h, ctx, c) {
    const loops = h.loopBlocks(ctx.doc);
    const run = ctx.trialRuns[0];
    // 结局 A：嵌套 loop 跑通；结局 B：AI 明确说明限制并用 code 扁平化实现（同样接受，但记录）
    if (loops.length >= 2) {
      c.add('嵌套 loop 结构', true, `loop 数=${loops.length}`);
    } else if (loops.length === 1) {
      c.add('单层 loop（外层班内层被合并处理）', true, `loop 数=1`);
    } else {
      const s = JSON.stringify(ctx.turns.map((t) => t.lastAssistant ?? ''));
      c.add('AI 说明容器限制或给出替代实现', /嵌套|不支持|限制|扁平/.test(s), s.slice(0, 300));
    }
    if (h.runOk(c, run)) {
      const s = JSON.stringify(run.outputs ?? {});
      c.add('一班含小明小红', s.includes('小明') && s.includes('小红'), s.slice(0, 300));
      c.add('二班含小刚', s.includes('小刚'), s.slice(0, 300));
      c.add('按班分组', /一班/.test(s) && /二班/.test(s), s.slice(0, 300));
    }
  },
};
