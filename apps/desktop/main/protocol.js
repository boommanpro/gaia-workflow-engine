/**
 * app:// 协议的 Electron 侧注册（路径解析纯逻辑在 protocol-core.js）。
 *
 * scheme 必须在 app ready 之前声明为 privileged（standard: 按 http URL 规则解析
 * hostname/path；secure: 允许 fetch/XHR/Worker；supportFetchAPI: renderer 内可用
 * fetch；stream: 流式响应），之后在 ready 后用 protocol.handle 接管请求。
 *
 * 响应实现：fs.promises.readFile 完全缓冲 + 显式 MIME + ETag/304 协商缓存。
 * · 不用 net.fetch(file://) 透传 —— 实测（Electron 45）其对 renderer 子资源
 *   （script/import()）会偶发挂起：主进程侧 body 全部 drain 成功，但 renderer 的
 *   加载事件永远不完成，首屏 React.lazy 悬起导致白屏（无任何报错）。
 * · 不用 readFileSync —— 同步 IO 会阻塞主进程事件循环，页面切换并发拉取多个
 *   chunk 时互相排队，表现为整体卡顿；异步读取让请求并行。
 * · 内容带 hash 的资源（rsbuild 产物）返回 immutable 长缓存，其余用 ETag 协商，
 *   二次进入页面时 304 直接过，避免重复传 5MB 级 monaco chunk。
 */

const { protocol } = require('electron');
const fsp = require('fs/promises');
const path = require('path');

const SCHEME = 'app';
const HOST = 'gaia';
/**
 * 应用首页地址。必须用根路径 app://gaia/ 而非 /index.html：
 * BrowserRouter 以 pathname 匹配路由，'/index.html' 不是任何已定义路由，
 * 会渲染为空；'/' 由协议层 SPA fallback 到 index.html（见 protocol-core）。
 */
const APP_INDEX_URL = `${SCHEME}://${HOST}/`;

const MIME_BY_EXT = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

const mimeOf = (file) => MIME_BY_EXT[path.extname(file).toLowerCase()] || 'application/octet-stream';

/** 内容带 hash 的静态资源（rsbuild 产物形如 main.1bc97c03.js）可永久缓存；其余协商缓存 */
const cacheControlOf = (file) =>
  /\.[0-9a-f]{8,}\.[^.]+$/.test(path.basename(file)) ? 'public, max-age=31536000, immutable' : 'no-cache';

/** 必须在 app ready 之前调用 */
const registerAppScheme = () => {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true },
    },
  ]);
};

/** ready 之后调用：把 app://gaia/** 映射到前端静态目录 */
const createAppProtocol = (frontendDir) => {
  const { resolveAppFile } = require('./protocol-core');
  protocol.handle(SCHEME, async (request) => {
    const notFound = () => new Response('Not Found', { status: 404 });
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return notFound();
    }
    if (url.hostname !== HOST) {
      return notFound();
    }
    const resolved = resolveAppFile(path.resolve(frontendDir), url.pathname);
    if (!resolved) {
      return notFound();
    }

    let stat;
    let body;
    try {
      stat = await fsp.stat(resolved.file);
      if (!stat.isFile()) {
        return notFound();
      }
      // ETag 用 size+mtime：构建产物文件不可变，命中即 304（省掉整包重传）
      const etag = `"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
      if (request.headers.get('if-none-match') === etag) {
        return new Response(null, { status: 304, headers: { etag } });
      }
      body = await fsp.readFile(resolved.file);
      return new Response(body, {
        status: 200,
        headers: {
          'content-type': mimeOf(resolved.file),
          'content-length': String(body.byteLength),
          etag,
          'cache-control': cacheControlOf(resolved.file),
        },
      });
    } catch {
      return notFound(); // 读间隙被删等竞态，按 404 处理
    }
  });
};

module.exports = { registerAppScheme, createAppProtocol, APP_INDEX_URL, SCHEME, HOST };
