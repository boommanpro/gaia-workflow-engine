/**
 * useStableActivity —— 稳定活动标签（防抖展示）。
 *
 * 问题：活动（思考/调用工具/生成回复）随事件逐条到达，子能力常在几百毫秒内
 * 完成，标签跟着逐事件刷新会快速闪烁，不可读。
 *
 * 算法（hysteresis + last-wins）：
 *  · 标签提交后至少停留 MIN_HOLD_MS，期间的新活动进待定（引用保持最新）；
 *    到期一次性提交待定标签 —— 切换频率被压到 ≤1 次/MIN_HOLD_MS。
 *  · 高优先级直通（immediate 判定）：清空（run 结束）与等待作答立即生效，
 *    不被停留期拖住。
 *  · 快速连发的工具序列由调用方聚合（见 LiveAssistantMessage 的 churn 检测），
 *    本 hook 只负责时间维度的稳定。
 */
import { useEffect, useRef, useState } from 'react';

export interface ActivityLabel {
  /** 稳定键：同键视为同一活动（不触发切换）；工具类键含工具名 */
  key: string;
  label: string;
  /** 直通活动（如等待作答）：到达即显示，不受最小停留约束 */
  immediate?: boolean;
}

/** 最小停留时长：一个活动标签的可读下限 */
const MIN_HOLD_MS = 1500;

export function useStableActivity(raw: ActivityLabel | undefined): string | undefined {
  const [committed, setCommitted] = useState<{ act: ActivityLabel | undefined; at: number }>(() => ({
    act: raw,
    at: Date.now(),
  }));
  const pendingRef = useRef<ActivityLabel | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 同键（含文案微变，如聚合计数 +1）：跟随更新但保留原起算时间，
    // 不占用切换窗口；曾挂起的异键候选也不再需要
    if (committed.act?.key === raw?.key) {
      pendingRef.current = undefined;
      if (committed.act?.label !== raw?.label) {
        setCommitted((c) => ({ act: raw, at: c.at }));
      }
      return;
    }
    // 清空（run 结束）与直通活动立即生效
    if (raw == null || raw.immediate) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingRef.current = undefined;
      if (committed.act?.key !== raw?.key) setCommitted({ act: raw, at: Date.now() });
      return;
    }
    if (committed.act?.key === raw.key) {
      pendingRef.current = undefined;
      return;
    }
    const elapsed = Date.now() - committed.at;
    if (elapsed >= MIN_HOLD_MS) {
      pendingRef.current = undefined;
      setCommitted({ act: raw, at: Date.now() });
      return;
    }
    // 停留期内：登记最新候选（last-wins），到期统一提交
    pendingRef.current = raw;
    if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const pending = pendingRef.current;
        pendingRef.current = undefined;
        if (pending) setCommitted({ act: pending, at: Date.now() });
      }, MIN_HOLD_MS - elapsed);
    }
  }, [raw, committed]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return committed.act?.label;
}
