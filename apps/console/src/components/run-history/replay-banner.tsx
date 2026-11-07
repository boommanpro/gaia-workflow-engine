/**
 * 画布回放横幅 —— 2026-11-07 运行历史方案 A。
 * 历史回放激活时浮在画布顶部中央：说明回放来源、提示画布与历史图的匹配度，
 * 并提供「退出回放」。
 *
 * 数据走模块级 replayStore（useSyncExternalStore），不 useService——
 * 本组件渲染在 FreeLayoutEditorProvider 子级、EditorRenderer 之外，
 * 该位置的 DI 上下文在编辑器容器重建窗口期解析不到 WorkflowRuntimeService
 * （渲染期抛 No matching bindings 会卸载整棵 React 树，2026-11-07 白屏实测）。
 * 状态与退出动作均由 runtime-service 写入 store，见 history-replay.ts。
 */
import { useSyncExternalStore } from 'react';

import { replayStore } from '../../plugins/runtime-plugin/runtime-service/history-replay';
import { useLanguage, t } from '../../i18n';

import styles from './index.module.less';

export const RunReplayBanner = () => {
  useLanguage();
  const replay = useSyncExternalStore(replayStore.subscribe, replayStore.getSnapshot);

  if (!replay) {
    return null;
  }
  const { state } = replay;

  return (
    <div className={styles['replay-banner']} role="status" aria-live="polite">
      <span className={styles['replay-banner-dot']} />
      <span className={styles['replay-banner-text']}>
        <b>{t('runHistory.replayMode')}</b>
        <span className={styles['replay-banner-from']}>
          {t('runHistory.replayFrom', { time: state.label })}
        </span>
        {state.matched < state.total && (
          <span className={styles['replay-banner-match']}>
            {t('runHistory.replayPartialMatch', { m: state.matched, t: state.total })}
          </span>
        )}
      </span>
      <button type="button" className={styles['replay-banner-exit']} onClick={replay.exit}>
        {t('runHistory.exitReplay')}
      </button>
    </div>
  );
};
