import { useCallback } from 'react';

import { useClientContext, usePlayground } from '@flowgram.ai/free-layout-editor';
import { Button, Tooltip } from '@douyinfe/semi-ui';
import { IconTreeTriangleRight } from '@douyinfe/semi-icons';

import { useModal } from '../../hooks/use-code-editor-modal';
import { PanelEnum, useSidebarContext } from '../../context';

export const RunWorkflow = () => {
  const ctx = useClientContext();
  const playground = usePlayground();
  const { openModal, modal } = useModal('', 'json');
  let { updatePanelValue } = useSidebarContext();

  const consoleJSON = useCallback(async () => {
    updatePanelValue(PanelEnum.WorkflowRun, {
      isRunning: true,
    });
  }, [ctx, openModal]);

  return (
    <>
      <Tooltip content={'Terminal Show JSON Data'}>
        <Button
          disabled={playground.config.readonly}
          type="tertiary"
          icon={<IconTreeTriangleRight />}
          theme="borderless"
          onClick={consoleJSON}
        >
          试运行
        </Button>
      </Tooltip>
      {modal}
    </>
  );
};
