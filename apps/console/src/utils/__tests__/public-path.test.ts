import { describe, it, expect } from 'vitest';

import { routeBasename } from '../public-path';

/**
 * BrowserRouter basename 只能来自绝对路径前缀：
 * - GitHub Pages '/gaia-workflow-engine/' → '/gaia-workflow-engine'
 * - electron / 静态部署 './' → ''（相对前缀不是路由的一部分；
 *   归一成 '.' 会让所有路由失配、页面渲染为空 —— electron 桌面版实测回归）
 */
describe('routeBasename', () => {
  it('绝对前缀保留并去尾部斜杠', () => {
    expect(routeBasename('/gaia-workflow-engine/')).toBe('/gaia-workflow-engine');
    expect(routeBasename('/gaia-workflow-engine')).toBe('/gaia-workflow-engine');
    expect(routeBasename('/sub/app/')).toBe('/sub/app');
  });

  it('相对前缀映射为空串（非路由前缀）', () => {
    expect(routeBasename('./')).toBe('');
    expect(routeBasename('.')).toBe('');
    expect(routeBasename('')).toBe('');
  });
});
