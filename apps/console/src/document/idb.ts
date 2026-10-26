/**
 * 画布快照的 IndexedDB 持久化 —— 替代旧 sessionStorage 同步写。
 *
 * 旧实现每次快照都把 ≤1.4MB 的 JSON 同步塞 sessionStorage（主线程阻塞、
 * 且超配额即放弃）。IndexedDB 天然异步：写入在防抖后进 microtask/IDB 线程，
 * 主线程零阻塞；配额上限内保留全部快照。
 */
import type { CanvasSnapshot } from './history';
import type { WorkflowDsl } from './types';

const DB_NAME = 'gaia-canvas';
const STORE = 'snapshots';
const KEY_PREFIX = 'scope:';
const LEGACY_PREFIX = 'gaia.canvasSnapshots:';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export interface PersistedScope {
  dsl: WorkflowDsl;
  snapshots: CanvasSnapshot[];
  cursor: number;
}

export async function saveSnapshots(scope: string, data: PersistedScope | null): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      if (data) store.put(data, KEY_PREFIX + scope);
      else store.delete(KEY_PREFIX + scope);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadSnapshots(scope: string): Promise<PersistedScope | null> {
  // sessionStorage 旧数据兼容读取一次（只读不清写：新写全部落 IDB）
  try {
    const legacy = sessionStorage.getItem(`${LEGACY_PREFIX}${scope}`);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const snapshots: CanvasSnapshot[] = Array.isArray(parsed?.snapshots) ? parsed.snapshots : [];
      if (snapshots.length > 0) {
        const cursor = Math.max(0, Math.min(parsed.cursor ?? snapshots.length - 1, snapshots.length - 1));
        const dsl = snapshots[cursor]?.dsl;
        if (dsl?.nodes?.length) return { dsl, snapshots, cursor };
      }
    }
  } catch {
    /* 旧数据不可解析则继续走 IDB */
  }
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY_PREFIX + scope);
      req.onsuccess = () => {
        const data = req.result as PersistedScope | undefined;
        if (data && Array.isArray(data.snapshots) && data.snapshots.length > 0 && data.dsl?.nodes?.length) {
          resolve(data);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
