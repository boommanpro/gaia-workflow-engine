/**
 * 后端探活 hook。
 *
 * 定时（默认 15s）请求后端 /health，暴露三类状态：
 *  checking（首次或手动重探中）/ online / offline。
 * 与 tts-skill 的做法保持一致，供顶部导航的连接状态灯使用。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { workflowApi } from '../services/workflow-api';

export type HealthStatus = 'checking' | 'online' | 'offline';

export function useHealthCheck(intervalMs = 15000) {
  const [status, setStatus] = useState<HealthStatus>('checking');
  const [refreshKey, setRefreshKey] = useState(0);
  const mountedRef = useRef(true);

  const run = useCallback(async () => {
    try {
      await workflowApi.health();
      if (mountedRef.current) setStatus('online');
    } catch {
      if (mountedRef.current) setStatus('offline');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    run();
    const timer = window.setInterval(run, intervalMs);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [run, intervalMs, refreshKey]);

  /** 手动重新探活：先置为检测中，再触发一次请求 */
  const retry = useCallback(() => {
    setStatus('checking');
    setRefreshKey((k) => k + 1);
  }, []);

  return { status, retry };
}