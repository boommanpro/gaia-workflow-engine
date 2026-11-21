import { describe, it, expect } from 'vitest';

import { publicPath } from '../public-path';

/**
 * jsdom 默认 location 为 http://localhost —— 覆盖「相对前缀在 http/app 环境下
 * 必须解析为根绝对路径」的回归：否则客户端路由切到子路由（如 /chat/new）后，
 * './logo.svg' 会被解析成 /chat/logo.svg 而 404（electron 桌面版实测：新建任务页
 * 左上角 logo 与侧栏头像丢失）。file:// 分支保留文档相对路径，无法在 jsdom 模拟。
 */
describe('publicPath（http 环境，ASSET_PREFIX=./）', () => {
  it('返回根绝对路径，带不带前导斜杠等价', () => {
    expect(publicPath('logo.svg')).toBe('/logo.svg');
    expect(publicPath('/logo.svg')).toBe('/logo.svg');
  });
});
