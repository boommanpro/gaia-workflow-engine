/**
 * protocol-core.resolveAppFile 单测：URL→文件映射、SPA fallback、目录穿越拒绝。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { resolveAppFile } = require('../main/protocol-core');

let dir;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gaia-protocol-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<html>index</html>');
  fs.writeFileSync(path.join(dir, 'logo.svg'), '<svg></svg>');
  fs.mkdirSync(path.join(dir, 'static', 'js'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'static', 'js', 'main.abc123.js'), 'console.log(1)');
  fs.mkdirSync(path.join(dir, 'admin'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'admin', 'readme.md'), 'x'); // 带扩展名的真实文件
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('静态文件直接命中', () => {
  it('根路径返回 index.html', () => {
    expect(resolveAppFile(dir, '/').file).toBe(path.join(dir, 'index.html'));
  });

  it('空 pathname 返回 index.html', () => {
    expect(resolveAppFile(dir, '').file).toBe(path.join(dir, 'index.html'));
  });

  it('logo.svg 命中', () => {
    expect(resolveAppFile(dir, '/logo.svg').file).toBe(path.join(dir, 'logo.svg'));
  });

  it('多级路径 + hash 文件名命中', () => {
    expect(resolveAppFile(dir, '/static/js/main.abc123.js').file).toBe(
      path.join(dir, 'static', 'js', 'main.abc123.js')
    );
  });

  it('percent 编码路径命中（中文文件名）', () => {
    fs.writeFileSync(path.join(dir, '中文.js'), '1');
    expect(resolveAppFile(dir, '/%E4%B8%AD%E6%96%87.js').file).toBe(path.join(dir, '中文.js'));
  });

  it('真实存在的带扩展名文件优先于 SPA fallback', () => {
    expect(resolveAppFile(dir, '/admin/readme.md').file).toBe(path.join(dir, 'admin', 'readme.md'));
  });
});

describe('SPA fallback：无扩展名路由回退 index.html', () => {
  it('/admin/workflows → index.html', () => {
    expect(resolveAppFile(dir, '/admin/workflows').file).toBe(path.join(dir, 'index.html'));
  });

  it('尾部斜杠路由 → index.html', () => {
    expect(resolveAppFile(dir, '/admin/workflows/').file).toBe(path.join(dir, 'index.html'));
  });

  it('多段无扩展名路由 → index.html', () => {
    expect(resolveAppFile(dir, '/a/b/c').file).toBe(path.join(dir, 'index.html'));
  });
});

describe('404：带扩展名但文件不存在', () => {
  it('缺失的 js 资源 → null', () => {
    expect(resolveAppFile(dir, '/static/js/missing.js')).toBeNull();
  });

  it('不存在的图片 → null', () => {
    expect(resolveAppFile(dir, '/favicon-404.ico')).toBeNull();
  });
});

describe('非法路径拒绝', () => {
  it('目录穿越 .. → null', () => {
    expect(resolveAppFile(dir, '/static/../../secrets.env')).toBeNull();
  });

  it('编码后的穿越 %2e%2e → null', () => {
    expect(resolveAppFile(dir, '/%2e%2e/%2e%2e/secrets.env')).toBeNull();
  });

  it('空字节注入 → null', () => {
    expect(resolveAppFile(dir, '/a%00.js')).toBeNull();
  });

  it('反斜杠（Windows 分隔符）→ null', () => {
    expect(resolveAppFile(dir, '/a\\b.js')).toBeNull();
  });

  it('非法百分号编码（%ZZ）→ null', () => {
    expect(resolveAppFile(dir, '/%ZZ.js')).toBeNull();
  });
});
