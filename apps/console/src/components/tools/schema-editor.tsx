import { useCallback, useEffect, useState } from 'react';

import { useClientContext, usePlayground } from '@flowgram.ai/free-layout-editor';
import { Button, Tooltip } from '@douyinfe/semi-ui';
import { IconTerminal } from '@douyinfe/semi-icons';

import { CodeEditorModal } from '../code-editor-modal';
import { useLanguage, t } from '../../i18n';

export const SchemaEditor = () => {
  const ctx = useClientContext();
  const [showData, setShowData] = useState('');
  const playground = usePlayground();
  useLanguage();
  const [showModal, setShowModal] = useState(false);
  const consoleJSON = useCallback(async () => {
    const jsonData = JSON.stringify(ctx.document.toJSON(), null, 2);
    setShowData(jsonData);
    setShowModal(true);
  }, [ctx]);

  const saveData = useCallback(
    async (data: any) => {
      await ctx.document.reload(JSON.parse(data));
      setTimeout(() => {
        ctx.document.fitView();
      }, 100);
    },
    [ctx]
  );

  useEffect(() => {
    const handleLoadWorkflow = (data: any) => {
      console.log('Editor组件收到加载工作流事件:', data);
      if (data.payload) {
        if (ctx && data.payload.content) {
          console.log('正在加载工作流内容到编辑器', data.payload.content);

          ctx.document
            .reload(data.payload.content)
            .then(() => {
              console.log('工作流内容加载完成');
              ctx.document.fitView();
            })
            .catch((error) => {
              console.error('工作流内容加载失败:', error);
            });
        }
      }
    };

    if (window.$wujie) {
      window.$wujie.bus.$on('loadWorkflow', handleLoadWorkflow);
    }

    return () => {
      if (window.$wujie) {
        window.$wujie.bus.$off('loadWorkflow', handleLoadWorkflow);
      }
    };
  }, []);

  return (
    <>
      <Tooltip content={t('tool.schemaEditor')}>
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
        onChange={saveData}
        options={{ readOnly: false }}
      />
    </>
  );
};
