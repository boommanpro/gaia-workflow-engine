/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 *
 * 快捷键帮助弹窗（内容与偏好面板「更多」共用）。
 */
import { Modal } from '@douyinfe/semi-ui';

import { t } from '../i18n';

export const SHORTCUT_ROWS: Array<[string, string]> = [
  ['prefs.help.copy', '⌘/Ctrl + C'],
  ['prefs.help.paste', '⌘/Ctrl + V'],
  ['prefs.help.delete', 'Backspace / Delete'],
  ['prefs.help.selectAll', '⌘/Ctrl + A'],
  ['prefs.help.undo', '⌘/Ctrl + Z'],
  ['prefs.help.redo', '⌘/Ctrl + ⇧ + Z'],
  ['prefs.help.zoom', '⌘/Ctrl + +/-'],
  ['prefs.help.collapse', '⌘/Ctrl + ⌥ + [ / ]'],
  ['prefs.help.group', '⌘/Ctrl + G'],
  ['prefs.help.ungroup', '⌘/Ctrl + ⇧ + G'],
];

export const ShortcutsHelpModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => (
  <Modal
    motion={false}
    title={t('prefs.help.title')}
    visible={visible}
    onCancel={onClose}
    footer={null}
    width={380}
  >
    <div className="gaia-shortcut-list">
      {SHORTCUT_ROWS.map(([key, combo]) => (
        <div key={key} className="gaia-shortcut-row">
          <span>{t(key)}</span>
          <code>{combo}</code>
        </div>
      ))}
    </div>
  </Modal>
);
