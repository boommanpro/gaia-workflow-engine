/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useState } from 'react';

import { usePlayground } from '@flowgram.ai/free-layout-editor';
import { Switch } from '@douyinfe/semi-ui';

import { useLanguage, t } from '../../i18n';

/**
 * 只读锁定（2026-11-07 改版）：偏好面板「更多」分区的整行条目——
 * 左标签 + 右 Switch（原 IconLock/IconUnlock 小图标钮命中区过小，2026-11-07 用户反馈）。
 */
export const Readonly = () => {
  const playground = usePlayground();
  useLanguage();
  const [readonly, setReadonly] = useState(playground.config.readonly);

  const toggleReadonly = useCallback(() => {
    playground.config.readonly = !readonly;
    setReadonly(!readonly);
  }, [playground, readonly]);

  return (
    <div className="gaia-prefs-action">
      <span className="gaia-prefs-action-label">{t('prefs.readonly')}</span>
      <Switch size="small" checked={readonly} onChange={toggleReadonly} />
    </div>
  );
};
