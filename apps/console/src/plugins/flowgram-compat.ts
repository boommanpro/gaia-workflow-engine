/**
 * 上游 @flowgram.ai 1.0.12 的已知 console 噪音收口（行为不变的静音补丁）。
 *
 * 1. FreeLayoutScopeChain.sortAll 是上游未实现的 stub（返回 []），但
 *    variable-layout 的 getCovers(GlobalScope) 初始化链会调用它并
 *    console.warn —— free-layout 场景每次打开编辑器必现且无信息量。
 *    不用 prototype patch：bundler 会把 src 与 flowgram 内部的
 *    variable-layout 解析成两个模块实例（index.js / vendors chunk 各一份），
 *    patch 打不到运行时实际用的那份；改为按精确文本过滤该 warn，
 *    sortAll 本身仍返回 []（上游行为不变）。升级 flowgram 后删除本补丁。
 */
let patched = false;

export function applyFlowgramCompatPatches(): void {
  if (patched || typeof console === 'undefined') return;
  patched = true;
  const origWarn = console.warn.bind(console);
  const SILENCED = 'FreeLayoutScopeChain.sortAll is not implemented';
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes(SILENCED)) return;
    origWarn(...args);
  };
}
