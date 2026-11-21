import { describe, expect, it } from 'vitest';

import {
  cronFromSimple,
  cronToHuman,
  formatPreviewTime,
  normalizeCron,
  simpleFromCron,
} from '../schedule-cron';

describe('normalizeCron', () => {
  it('5 位 unix cron 补秒位', () => {
    expect(normalizeCron('0 9 * * *')).toBe('0 0 9 * * *');
    expect(normalizeCron('*/15 * * * *')).toBe('0 */15 * * * *');
  });
  it('6 位原样 / 7 位截掉年 / 其它形状 null', () => {
    expect(normalizeCron('0 0 9 * * *')).toBe('0 0 9 * * *');
    expect(normalizeCron('0 0 9 * * * 2027')).toBe('0 0 9 * * *');
    expect(normalizeCron('* * * *')).toBeNull();
    expect(normalizeCron('')).toBeNull();
    expect(normalizeCron(null)).toBeNull();
  });
});

describe('cronToHuman', () => {
  it('识别常见形态', () => {
    expect(cronToHuman('0 * * * * *')).toBe('每分钟');
    expect(cronToHuman('* * * * * *')).toBe('每秒');
    expect(cronToHuman('0 5 * * * *')).toBe('每小时第 5 分');
    expect(cronToHuman('0 */15 * * * *')).toBe('每 15 分钟');
    expect(cronToHuman('0 0 9 * * *')).toBe('每天 09:00');
    expect(cronToHuman('0 9 * * *')).toBe('每天 09:00');
    expect(cronToHuman('0 0 9 * * 1-5')).toBe('每个工作日 09:00');
    expect(cronToHuman('0 0 10 * * 1')).toBe('每周一 10:00');
    expect(cronToHuman('0 0 9 * * 1,3,5')).toBe('每周一/三/五 09:00');
    expect(cronToHuman('0 0 9 1 * *')).toBe('每月 1 日 09:00');
    expect(cronToHuman('0 30 */3 * * *')).toBe('每 3 小时的第 30 分');
  });
  it('识别不了的形态展示规范式原文', () => {
    expect(cronToHuman('0 0 9,11 * * *')).toBe('0 0 9,11 * * *');
    expect(cronToHuman('30 0 9 * * *')).toBe('30 0 9 * * *');
  });
});

describe('simpleFromCron / cronFromSimple 双向转换', () => {
  it('cron → 简单模式 → cron 往返一致', () => {
    for (const cron of ['0 * * * * *', '0 5 * * * *', '0 0 9 * * *', '0 30 10 * * 3', '0 0 9 1 * *']) {
      const sc = simpleFromCron(cron);
      expect(sc, cron).not.toBeNull();
      expect(cronFromSimple(sc!), JSON.stringify(sc)).toBe(cron);
    }
  });
  it('复杂 cron 返回 null（弹窗落 Cron 高级模式）', () => {
    expect(simpleFromCron('0 0 9 * * 1-5')).toBeNull();
    expect(simpleFromCron('0 */15 * * * *')).toBeNull();
    expect(simpleFromCron('30 0 9 * * *')).toBeNull();
  });
});

describe('formatPreviewTime', () => {
  it('ISO 字符串转本地展示（无法解析原样返回）', () => {
    const out = formatPreviewTime('2026-11-22T09:00');
    expect(out).toMatch(/11-22 09:00/);
    expect(formatPreviewTime('not-a-date')).toBe('not-a-date');
  });
});
