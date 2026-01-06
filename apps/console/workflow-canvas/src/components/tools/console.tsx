import { useCallback } from 'react';

import { useClientContext, usePlayground } from '@flowgram.ai/free-layout-editor';
import { Button, Tooltip } from '@douyinfe/semi-ui';
import { IconTerminal } from '@douyinfe/semi-icons';

import { useModal } from '../../hooks/use-code-editor-modal';

export const Console = () => {
  const ctx = useClientContext();
  const playground = usePlayground();
  const { openModal, modal } = useModal('', 'json');

  const consoleJSON = useCallback(async () => {
    const jsonData = JSON.stringify(ctx.document.toJSON(), null, 2);
    openModal(jsonData);
  }, [ctx, openModal]);

  return (
    <>
      <Tooltip content={'Terminal Show JSON Data'}>
        <Button
          disabled={playground.config.readonly}
          type="tertiary"
          icon={<IconTerminal />}
          theme="borderless"
          onClick={consoleJSON}
        />
      </Tooltip>
      {modal}
    </>
  );
};
