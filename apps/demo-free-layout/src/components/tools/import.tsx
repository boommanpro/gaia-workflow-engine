import { useCallback, useState } from 'react';

import { useClientContext, usePlayground } from '@flowgram.ai/free-layout-editor';
import { Button, Tooltip } from '@douyinfe/semi-ui';
import { IconUpload } from '@douyinfe/semi-icons';

import { CodeEditorModal } from '../code-editor-modal';

export const Import = () => {
  const ctx = useClientContext();
  const [showData, setShowData] = useState('');
  const playground = usePlayground();
  const [showModal, setShowModal] = useState(false);
  const consoleJSON = useCallback(async () => {
    const jsonData = JSON.stringify(ctx.document.toJSON(), null, 2);
    setShowData(jsonData); // 先更新 showData
    setShowModal(true); // 然后再显示 Modal
  }, [ctx]);

  const saveData = useCallback(
    async (data: any) => {
      await ctx.document.reload(JSON.parse(data));
      setTimeout(() => {
        // 加载后触发画布的 fitview 让节点自动居中
        ctx.document.fitView();
      }, 100);
    },
    [ctx]
  );

  return (
    <>
      <Tooltip content={'Import JSON Data And Reload'}>
        <Button
          disabled={playground.config.readonly}
          type="tertiary"
          icon={<IconUpload />}
          theme="borderless"
          onClick={consoleJSON}
        />
      </Tooltip>
      <CodeEditorModal
        value={showData}
        language={'json'}
        visible={showModal}
        onVisibleChange={setShowModal}
        onChange={saveData}
        options={{ readOnly: false }}
      />
    </>
  );
};
