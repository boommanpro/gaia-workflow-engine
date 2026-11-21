/**
 * 定时任务 cron 前端工具：人话描述 + 简单模式⇄cron 双向转换。
 *
 * 校验与「未来触发时间预览」以后端 /api/schedule/preview 为权威（P-03 人机同规），
 * 这里只做展示层的形状判定（normalize）与描述转换，不复制后端校验规则。
 */

export type CronFreq = 'everyMinute' | 'everyHour' | 'everyDay' | 'everyWeek' | 'everyMonth';

export interface SimpleCron {
  freq: CronFreq;
  /** 每天/每周/每月的触发时刻 HH:MM */
  time: string;
  /** 每周：0=周日 … 6=周六 */
  weekday: number;
  /** 每月：1-31 日 */
  monthDay: number;
  /** 每小时：第几分钟 0-59 */
  hourMin: number;
}

/** 选择器用的全称（周日/周一/…） */
export const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
/** 人话描述用的单字（与「每周」拼接，不能自带周前缀） */
const WEEKDAY_CHARS = ['日', '一', '二', '三', '四', '五', '六'];

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 5 位 unix（分 时 日 月 周）补秒位 → 6 位 Spring cron；6 位原样；7 位截掉年；其它形状 null */
export const normalizeCron = (input?: string | null): string | null => {
  const parts = String(input ?? '').trim().split(/\s+/);
  if (parts.length === 5) return ['0', ...parts].join(' ');
  if (parts.length === 6 || parts.length === 7) return parts.slice(0, 6).join(' ');
  return null;
};

const any = (f: string) => f === '*';
const single = (f: string) =>
  !f.includes('*') && !f.includes('/') && !f.includes('-') && f.split(',').length === 1;

/** cron → 人话描述（识别常见形态，兜底展示原文） */
export const cronToHuman = (cron?: string | null): string => {
  const nc = normalizeCron(cron);
  if (!nc) return String(cron ?? '');
  const [s, m, h, dom, mon, dow] = nc.split(' ');
  if (s === '*' && [m, h, dom, mon, dow].every(any)) return '每秒';
  if (s !== '0' && s !== '*') return nc;
  if (any(dom) && any(mon)) {
    if (any(dow) && any(h) && any(m)) return '每分钟';
    if (any(dow) && any(h) && single(m)) return `每小时第 ${Number(m)} 分`;
    if (any(dow) && any(h) && /^\*\/(\d+)$/.test(m)) return `每 ${RegExp.$1} 分钟`;
    if (single(h) && single(m)) {
      const time = `${pad2(Number(h))}:${pad2(Number(m))}`;
      if (any(dow)) return `每天 ${time}`;
      if (/^1-5$/.test(dow)) return `每个工作日 ${time}`;
      if (single(dow)) return `每周${WEEKDAY_CHARS[Number(dow) % 7]} ${time}`;
      if (dow.includes(',')) {
        return `每周${dow.split(',').map((d) => WEEKDAY_CHARS[Number(d) % 7]).join('/')} ${time}`;
      }
    }
    if (any(dow) && /^\*\/(\d+)$/.test(h) && single(m)) return `每 ${RegExp.$1} 小时的第 ${Number(m)} 分`;
  }
  if (any(mon) && any(dow) && single(dom) && single(h) && single(m)) {
    return `每月 ${Number(dom)} 日 ${pad2(Number(h))}:${pad2(Number(m))}`;
  }
  return nc;
};

/** 简单模式 → 6 位 Spring cron */
export const cronFromSimple = (sc: SimpleCron): string => {
  const [hh, mm] = (sc.time || '09:00').split(':').map(Number);
  switch (sc.freq) {
    case 'everyMinute':
      return '0 * * * * *';
    case 'everyHour':
      return `0 ${sc.hourMin} * * * *`;
    case 'everyDay':
      return `0 ${mm} ${hh} * * *`;
    case 'everyWeek':
      return `0 ${mm} ${hh} * * ${sc.weekday}`;
    case 'everyMonth':
      return `0 ${mm} ${hh} ${sc.monthDay} * *`;
  }
};

/** cron → 简单模式选中态；识别不了的形态返回 null（弹窗落在 Cron 高级模式） */
export const simpleFromCron = (cron?: string | null): SimpleCron | null => {
  const nc = normalizeCron(cron);
  if (!nc) return null;
  const [s, m, h, dom, mon, dow] = nc.split(' ');
  if (s !== '0' || mon !== '*') return null;
  const time = single(h) && single(m) ? `${pad2(Number(h))}:${pad2(Number(m))}` : '09:00';
  if (any(m) && any(h) && any(dom) && any(dow)) {
    return { freq: 'everyMinute', time, weekday: 1, monthDay: 1, hourMin: 0 };
  }
  if (single(m) && any(h) && any(dom) && any(dow)) {
    return { freq: 'everyHour', time, weekday: 1, monthDay: 1, hourMin: Number(m) };
  }
  if (single(m) && single(h) && any(dom)) {
    if (any(dow)) return { freq: 'everyDay', time, weekday: 1, monthDay: 1, hourMin: 0 };
    if (single(dow)) {
      return { freq: 'everyWeek', time, weekday: Number(dow) % 7, monthDay: 1, hourMin: 0 };
    }
  }
  if (single(m) && single(h) && single(dom) && any(dow)) {
    return { freq: 'everyMonth', time, weekday: 1, monthDay: Number(dom), hourMin: 0 };
  }
  return null;
};

/** 后端预览返回的 ISO 日期（2026-11-22T09:00）→ 本机时区展示 */
export const formatPreviewTime = (iso: string): string => {
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return iso;
  const week = WEEKDAY_LABELS[d.getDay()];
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}（${week}）`;
};
