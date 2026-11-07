/**
 * 版本 / 画布内容键：识别「画布内容是否恰好等于某个版本」的统一基准。
 *
 * 关键设计：versionContentKey 走与画布完全相同的 fromJSON → toJSON 序列化管线，
 * 两侧可直接字符串比对（载入的内容正是从同一条管线产出的），指纹不匹配时调用方
 * 按「不相等」兜底，不影响正确性。
 *
 * 判定标准（2026-11-04 用户决策·B「完全按直觉」）：任何序列化差异都算内容变更——
 * 节点坐标（meta.position）参与比对，拖动节点即产生「未发布的修改」，可发布携带
 * 新坐标的新版本。同日晚间的「坐标剥离」标准作废（其防垃圾版本的职责交还给
 * 发布确认弹窗的差异说明）。
 *
 * 用途：编辑器「发布生效」按内容路由（等于旧版本 → set-current 切指针；否则 →
 * applyDsl 新版本）+ 时间线里程碑「当前」标记。
 */
import { WorkflowDocument } from './workflow-document';

/** 画布 DSL → 内容键（全字段序列化，含节点坐标） */
export function canvasContentKey(dsl: unknown): string {
  if (!dsl || typeof dsl !== 'object') return 'null';
  return JSON.stringify(dsl);
}

/** 落版版本的 workflowData → 内容键；空/无法解析返回 null */
export function versionContentKey(workflowData?: string): string | null {
  if (!workflowData) return null;
  try {
    return canvasContentKey(WorkflowDocument.fromJSON(workflowData).toJSON());
  } catch {
    return null;
  }
}
