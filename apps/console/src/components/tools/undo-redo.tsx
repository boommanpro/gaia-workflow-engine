/**
 * 撤销 / 重做按钮（2026-11-05 工具栏改版）：走 useClientContext().history
 * （⌘Z / ⇧⌘Z 内置快捷键同一服务），canUndo/canRedo 随栈变化即时禁用。
 */
import { useEffect, useState } from 'react';

import { useClientContext } from '@flowgram.ai/free-layout-editor';
import { IconButton, Tooltip } from '@douyinfe/semi-ui';
import { IconUndo, IconRedo } from '@douyinfe/semi-icons';

import { useLanguage, t } from '../../i18n';

export const UndoRedo = () => {
  const { history, playground } = useClientContext();
  useLanguage();
  const [state, setState] = useState({ canUndo: history.canUndo(), canRedo: history.canRedo() });

  useEffect(() => {
    const sync = () => setState({ canUndo: history.canUndo(), canRedo: history.canRedo() });
    sync();
    const disposable = history.undoRedoService.onChange(() => sync());
    return () => disposable.dispose();
  }, [history]);

  const disabled = playground.config.readonly;

  return (
    <>
      <Tooltip content={t('tool.undo')}>
        <IconButton
          icon={<IconUndo />}
          type="tertiary"
          theme="borderless"
          disabled={!state.canUndo || disabled}
          onClick={() => void history.undo()}
          aria-label={t('tool.undo')}
        />
      </Tooltip>
      <Tooltip content={t('tool.redo')}>
        <IconButton
          icon={<IconRedo />}
          type="tertiary"
          theme="borderless"
          disabled={!state.canRedo || disabled}
          onClick={() => void history.redo()}
          aria-label={t('tool.redo')}
        />
      </Tooltip>
    </>
  );
};
