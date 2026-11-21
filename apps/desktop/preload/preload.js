/**
 * preload（sandboxed，contextIsolation 默认开启）。
 *
 * 唯一职责：后端落在本机非默认端口时，把 localStorage.apiBaseUrl 指过去。
 * 前端 apiConfig.ts 的取值优先级是 localStorage > 构建期注入，这里只在
 * 「用户没有自定义过（空值或等于默认 48080 地址）」时写入，尊重既有配置。
 * 决策条件与 main/backend-core.js 的 shouldOverrideApiBaseUrl 保持一致
 * （preload 沙箱下不能 require 项目文件，故内联这 1 行判断）。
 */
(() => {
  const arg = process.argv.find((a) => a && a.startsWith('--gaia-api-base='));
  if (!arg) {
    return;
  }
  const apiBase = arg.slice('--gaia-api-base='.length);
  const DEFAULT_API_BASE = 'http://127.0.0.1:48080/api';
  try {
    const stored = localStorage.getItem('apiBaseUrl');
    const isUntouched = !stored || stored === DEFAULT_API_BASE;
    if (apiBase !== DEFAULT_API_BASE && isUntouched) {
      localStorage.setItem('apiBaseUrl', apiBase);
    }
  } catch {
    /* localStorage 不可用时静默放弃，前端会走默认地址 */
  }
})();
