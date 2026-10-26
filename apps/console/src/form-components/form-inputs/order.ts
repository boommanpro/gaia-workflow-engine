/** 按给定顺序排列字段键：order 里的先按序出现，其余保持原顺序追加（纯函数，表单行序与数据键序解耦） */
export function orderInputKeys(keys: string[], order?: string[]): string[] {
  if (!order || order.length === 0) return keys;
  const present = new Set(keys);
  const head = order.filter((key) => present.has(key));
  const headSet = new Set(head);
  return [...head, ...keys.filter((key) => !headSet.has(key))];
}
