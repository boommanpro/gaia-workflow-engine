/**
 * 侧栏分组展开状态持久化契约回归（2026-11-08 路由切换分组被折叠）：
 * /chat ↔ /workflows 切换会重建 ProjectRail，展开集与未分组开关必须从
 * localStorage 原样恢复；坏数据（非 JSON / 非数组 / 非整数）回退为空不抛错；
 * localStorage 不可用（隐私模式等）时读写静默降级。
 *
 * vitest 环境为 node（无 localStorage），用内存版 Storage 打桩。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadExpandedFolders,
  loadUnfiledOpen,
  saveExpandedFolders,
  saveUnfiledOpen,
} from '../project-rail-persistence';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => {
      map.delete(k);
    },
    setItem: (k, v) => {
      map.set(k, String(v));
    },
  };
}

describe('project-rail-persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('无记录时默认全部折叠', () => {
    expect(loadExpandedFolders()).toEqual(new Set());
    expect(loadUnfiledOpen()).toBe(false);
  });

  it('展开默认空间 + 未分组后，侧栏重建（重新读取初始值）原样恢复', () => {
    saveExpandedFolders(new Set([3, 17]));
    saveUnfiledOpen(true);
    expect(loadExpandedFolders()).toEqual(new Set([3, 17]));
    expect(loadUnfiledOpen()).toBe(true);
  });

  it('折叠回去也持久化：空集 / false 往返一致', () => {
    saveExpandedFolders(new Set([3]));
    saveUnfiledOpen(true);
    saveExpandedFolders(new Set());
    saveUnfiledOpen(false);
    expect(loadExpandedFolders()).toEqual(new Set());
    expect(loadUnfiledOpen()).toBe(false);
  });

  it('坏数据回退：非 JSON / 非数组为空集，混入的非整数项被丢弃', () => {
    localStorage.setItem('gaia.projectRail.expanded', '{oops');
    expect(loadExpandedFolders()).toEqual(new Set());
    localStorage.setItem('gaia.projectRail.expanded', '"nope"');
    expect(loadExpandedFolders()).toEqual(new Set());
    localStorage.setItem('gaia.projectRail.expanded', JSON.stringify([1, 'x', 2.5, null, -4, 7]));
    expect(loadExpandedFolders()).toEqual(new Set([1, 7]));
  });

  it('localStorage 不可用时读返回默认值、写不抛错', () => {
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    vi.stubGlobal('localStorage', throwing);
    expect(loadExpandedFolders()).toEqual(new Set());
    expect(loadUnfiledOpen()).toBe(false);
    expect(() => saveExpandedFolders(new Set([1]))).not.toThrow();
    expect(() => saveUnfiledOpen(true)).not.toThrow();
  });
});
