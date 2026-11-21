/**
 * 解析 public 目录下静态资源的 URL
 *
 * 背景：Rsbuild 的 import.meta.env.BASE_URL 在 assetPrefix 为相对路径（'./'）
 * 时会被求值为空字符串，导致拼接出 '/logo.svg' 这样的绝对路径，
 * 在 GitHub Pages 子路径部署（/gaia-workflow-engine/）下会 404。
 *
 * 这里改用构建时通过 rsbuild.config.ts 的 define 注入的 process.env.ASSET_PREFIX，
 * 它在 .env.github 中配置为 '/gaia-workflow-engine/'，本地开发为 './'，
 * 都能正确拼接出可访问的资源路径。
 */
const ASSET_PREFIX: string = process.env.ASSET_PREFIX || './';

/**
 * 返回 public 目录下指定资源的完整路径
 * @example publicPath('logo.svg') // => '/gaia-workflow-engine/logo.svg' 或 '/logo.svg'
 */
export const publicPath = (asset: string): string => {
  const prefix = ASSET_PREFIX.endsWith('/') ? ASSET_PREFIX : `${ASSET_PREFIX}/`;
  const name = asset.startsWith('/') ? asset.slice(1) : asset;
  // 相对前缀 './' 在非根路由页面（如 /chat/new）下会被解析成 /chat/logo.svg 而 404
  // （http 与 electron app:// 下均如此），因此除 file:// 外一律用根绝对路径。
  // file:// 没有站点根概念，只能保持文档相对路径。
  if (prefix === './') {
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      return `./${name}`;
    }
    return `/${name}`;
  }
  return `${prefix}${name}`;
};

/**
 * 从 ASSET_PREFIX 推导 BrowserRouter 的 basename。
 * 只有以 / 开头的绝对前缀才是路由前缀（GitHub Pages 的 '/gaia-workflow-engine/'）；
 * 相对前缀（'./'，electron app:// 等静态形态）不是路由的一部分，必须映射为 ''，
 * 否则 './' 会被归一成 basename '.'，导致所有路由失配、页面渲染为空。
 */
export const routeBasename = (assetPrefix: string): string =>
  assetPrefix.startsWith('/') ? assetPrefix.replace(/\/+$/, '') : '';
