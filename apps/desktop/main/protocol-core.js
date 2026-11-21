/**
 * app:// 协议的纯路径解析逻辑（不依赖 electron，可单测）。
 *
 * 背景：console 前端使用 BrowserRouter（src/main.tsx），file:// 协议下路由无法工作，
 * 因此桌面版注册 app:// 自定义协议，按 http 语义把 URL 映射到前端静态文件目录：
 *   app://gaia/index.html          -> <frontendDir>/index.html
 *   app://gaia/static/js/x.js      -> <frontendDir>/static/js/x.js
 *   app://gaia/admin/workflows     -> <frontendDir>/index.html（SPA fallback，路由交给 React Router）
 *   app://gaia/static/missing.js   -> 404（带扩展名但文件不存在，不是路由）
 */

const path = require('path');
const fs = require('fs');

const INDEX_HTML = 'index.html';

/**
 * 把 URL pathname 解析为前端目录下的文件。
 * @returns {{file: string}} 命中文件；SPA fallback 时返回 index.html
 * @returns {null} 404：非法路径（穿越/坏编码）或带扩展名但文件不存在
 */
const resolveAppFile = (frontendDir, pathname) => {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null; // 非法百分号编码（如 %ZZ）
  }

  const segments = decoded.split('/').filter((s) => s.length > 0);
  // 拒绝目录穿越与空字节（Windows 路径分隔符一并拒绝，路径最终只用于本机文件读取）
  if (segments.some((s) => s === '..' || s === '.' || s.includes('\0') || s.includes('\\'))) {
    return null;
  }

  const relative = segments.join('/');
  const candidate = relative === '' ? path.join(frontendDir, INDEX_HTML) : path.join(frontendDir, relative);

  // 二次防御：归一化后必须仍在前端目录内
  const normalizedFrontend = path.resolve(frontendDir);
  if (!path.resolve(candidate).startsWith(normalizedFrontend + path.sep)) {
    return null;
  }

  let stat = null;
  try {
    stat = fs.statSync(candidate);
  } catch {
    stat = null;
  }

  if (stat && stat.isFile()) {
    return { file: candidate };
  }

  // 无扩展名视为前端路由，回退 index.html（BrowserRouter 接管）；
  // 有扩展名说明是资源请求，缺失即 404
  const lastSegment = segments[segments.length - 1] || '';
  if (lastSegment.includes('.')) {
    return null;
  }
  return { file: path.join(frontendDir, INDEX_HTML) };
};

module.exports = { resolveAppFile, INDEX_HTML };
