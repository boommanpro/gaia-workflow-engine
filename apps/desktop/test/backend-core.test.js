/**
 * backend-core 纯函数单测：java 版本解析、地址/参数构造、preload 注入条件。
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  DEFAULT_PORT,
  DEFAULT_API_BASE,
  MIN_JAVA_MAJOR,
  parseJavaMajor,
  buildHealthUrl,
  buildApiBase,
  buildJavaArgs,
  shouldOverrideApiBaseUrl,
} = require('../main/backend-core');

describe('parseJavaMajor', () => {
  it('现代形态：21.0.5 → 21', () => {
    expect(parseJavaMajor('openjdk version "21.0.5" 2024-10-15 LTS')).toBe(21);
  });

  it('Temurin 形态：17.0.2 → 17', () => {
    expect(parseJavaMajor('openjdk version "17.0.2" 2022-01-18')).toBe(17);
  });

  it('旧式前缀：1.8.0_292 → 8', () => {
    expect(parseJavaMajor('java version "1.8.0_292"')).toBe(8);
  });

  it('LTS 后缀带+号：21.0.1+12-LTS → 21', () => {
    expect(parseJavaMajor('openjdk version "21.0.1+12-LTS"')).toBe(21);
  });

  it('EA 形态：23-ea → 23', () => {
    expect(parseJavaMajor('openjdk version "23-ea" build 23-ea+1')).toBe(23);
  });

  it('无版本行 → null', () => {
    expect(parseJavaMajor('Command not found')).toBeNull();
  });

  it('空串/非字符串 → null', () => {
    expect(parseJavaMajor('')).toBeNull();
    expect(parseJavaMajor(null)).toBeNull();
    expect(parseJavaMajor(undefined)).toBeNull();
  });
});

describe('地址与参数构造', () => {
  it('默认端口常量为 48080（与后端 application.yml 一致）', () => {
    expect(DEFAULT_PORT).toBe(48080);
  });

  it('健康检查地址', () => {
    expect(buildHealthUrl(48080)).toBe('http://127.0.0.1:48080/api/health');
    expect(buildHealthUrl(51234)).toBe('http://127.0.0.1:51234/api/health');
  });

  it('apiBaseUrl 地址（供 preload 注入）', () => {
    expect(buildApiBase(48080)).toBe(DEFAULT_API_BASE);
    expect(buildApiBase(51234)).toBe('http://127.0.0.1:51234/api');
  });

  it('默认端口不带 --server.port 参数', () => {
    expect(buildJavaArgs('/x/gaia.jar', 48080)).toEqual(['-jar', '/x/gaia.jar']);
  });

  it('非默认端口追加 --server.port 覆盖', () => {
    expect(buildJavaArgs('/x/gaia.jar', 51234)).toEqual(['-jar', '/x/gaia.jar', '--server.port=51234']);
  });

  it('最低 Java 版本为 21（代码节点 -source 21 硬约束）', () => {
    expect(MIN_JAVA_MAJOR).toBe(21);
  });
});

describe('shouldOverrideApiBaseUrl（preload 注入条件）', () => {
  const FALLBACK = 'http://127.0.0.1:51234/api';

  it('端口就是默认值时无需注入', () => {
    expect(shouldOverrideApiBaseUrl(null, DEFAULT_API_BASE)).toBe(false);
    expect(shouldOverrideApiBaseUrl(DEFAULT_API_BASE, DEFAULT_API_BASE)).toBe(false);
  });

  it('用户未配置过（空值）且端口非默认 → 注入', () => {
    expect(shouldOverrideApiBaseUrl(null, FALLBACK)).toBe(true);
    expect(shouldOverrideApiBaseUrl('', FALLBACK)).toBe(true);
  });

  it('当前值是默认地址且端口非默认 → 注入（改写默认，非用户自定义）', () => {
    expect(shouldOverrideApiBaseUrl(DEFAULT_API_BASE, FALLBACK)).toBe(true);
  });

  it('用户自定义过远程地址 → 不覆盖', () => {
    expect(shouldOverrideApiBaseUrl('https://gaia.example.com/api', FALLBACK)).toBe(false);
  });
});
