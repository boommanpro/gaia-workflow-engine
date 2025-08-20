import React from 'react';

import { I18n } from '@flowgram.ai/i18n';

import { useControlTips } from './use-control';
import { SubCanvasTipsStyle } from './style';
import { isMacOS } from './is-mac-os';
import { IconClose } from './icon-close';

interface SubCanvasTipsProps {
  tipText?: string | React.ReactNode;
  neverRemindText?: string | React.ReactNode;
}

export const SubCanvasTips = ({ tipText, neverRemindText }: SubCanvasTipsProps) => {
  const { visible, close, closeForever } = useControlTips();

  const displayContent =
    tipText || I18n.t('Hold {{key}} to drag node out', { key: isMacOS ? 'Cmd ⌘' : 'Ctrl' });

  if (!visible) {
    return null;
  }
  return (
    <SubCanvasTipsStyle className={'sub-canvas-tips'}>
      <div className="container">
        <div className="content">
          {typeof displayContent === 'string' ? (
            <p className="text">{displayContent}</p>
          ) : (
            <div className="custom-content">{displayContent}</div>
          )}
          <div
            className="space"
            style={{
              width: 0,
            }}
          />
        </div>
        <div className="actions">
          <p className="close-forever" onClick={closeForever}>
            {neverRemindText || I18n.t('Never Remind')}
          </p>
          <div className="close" onClick={close}>
            <IconClose />
          </div>
        </div>
      </div>
    </SubCanvasTipsStyle>
  );
};
