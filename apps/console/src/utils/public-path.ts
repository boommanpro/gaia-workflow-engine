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
 * 返回 public 目录下指定资源的完整相对路径
 * @example publicPath('logo.svg') // => '/gaia-workflow-engine/logo.svg' 或 './logo.svg'
 */
export const publicPath = (asset: string): string => {
  const prefix = ASSET_PREFIX.endsWith('/') ? ASSET_PREFIX : `${ASSET_PREFIX}/`;
  const name = asset.startsWith('/') ? asset.slice(1) : asset;
  return `${prefix}${name}`;
};
