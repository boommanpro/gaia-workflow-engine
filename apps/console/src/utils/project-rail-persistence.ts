/**
 * 侧栏项目分组展开状态持久化 —— 跨路由重建保留用户的手动展开。
 *
 * /chat 与 /workflows 是两份互不相干的路由分支（AiWorkspace / WorkflowsLayout），
 * 各自渲染一份 AppRail→ProjectRail；路由一切换侧栏实例即卸载重建，组件局部
 * state 归零，用户手动展开的分组（典型：默认空间 + 未分组）被全部折叠
 * （2026-11-08 交互审计：/workflows 点对话、对话页点工作流管理均复现）。
 *
 * 展开集与未分组开关持久化到 localStorage（与 AppShell 的 railHidden/railWidth
 * 同一模式），重建/刷新后原样恢复；「当前会话所在分组自动展开」仍由组件内
 * effect 兜底，与恢复值叠加不冲突。坏数据（非 JSON / 非数组 / 非整数）回退为空。
 */
const EXPANDED_KEY = 'gaia.projectRail.expanded';
const UNFILED_KEY = 'gaia.projectRail.unfiledOpen';

/** 恢复展开的项目 id 集；无记录或数据损坏时返回空集（全部折叠） */
export function loadExpandedFolders(): Set<number> {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY);
    if (!raw) return new Set();
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((n): n is number => Number.isInteger(n) && n >= 0));
  } catch {
    return new Set();
  }
}

/** 写回展开的项目 id 集（写失败静默：隐私模式等场景不影响交互） */
export function saveExpandedFolders(ids: Set<number>): void {
  try {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

/** 恢复「未分组」开关；默认 false（折叠） */
export function loadUnfiledOpen(): boolean {
  try {
    return localStorage.getItem(UNFILED_KEY) === '1';
  } catch {
    return false;
  }
}

/** 写回「未分组」开关 */
export function saveUnfiledOpen(open: boolean): void {
  try {
    localStorage.setItem(UNFILED_KEY, open ? '1' : '0');
  } catch {
    /* ignore */
  }
}
