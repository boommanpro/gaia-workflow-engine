import { useCallback, useEffect, useState } from 'react';

import { useClientContext, usePlayground } from '@flowgram.ai/free-layout-editor';
import { Button, Tooltip } from '@douyinfe/semi-ui';
import { IconTerminal } from '@douyinfe/semi-icons';

import { CodeEditorModal } from '../code-editor-modal';

export const Console = () => {
  const ctx = useClientContext();
  const [showData, setShowData] = useState('');
  const playground = usePlayground();
  const [showModal, setShowModal] = useState(false);
  const consoleJSON = useCallback(async () => {
    const jsonData = JSON.stringify(ctx.document.toJSON(), null, 2);
    setShowData(jsonData); // 先更新 showData
    setShowModal(true); // 然后再显示 Modal
  }, [ctx]);

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
      <CodeEditorModal
        value={showData}
        language={'json'}
        visible={showModal}
        onVisibleChange={setShowModal}
        options={{ readOnly: true }}
      />
    </>
  );
};
