import { useCallback } from 'react';

import { useClientContext, usePlayground } from '@flowgram.ai/free-layout-editor';
import { Button, Tooltip } from '@douyinfe/semi-ui';

import { IconComment } from '../../assets/icon-comment.tsx';

export const AddNote = () => {
  const playground = usePlayground();
  const ctx = useClientContext();
  const addNote = useCallback(async () => {
    const randomId = `note_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    ctx.document.createWorkflowNodeByType(
      'note',
      { x: 100, y: 100 },
      {
        id: randomId,
        data: {
          title: 'Note',
          content: '',
        },
        meta: {
          size: {
            width: 240,
            height: 150,
          },
        },
      }
    );
  }, [ctx]);

  return (
    <Tooltip content={'Add Note'}>
      <Button
        disabled={playground.config.readonly}
        type="tertiary"
        icon={<IconComment />}
        theme="borderless"
        onClick={addNote}
      />
    </Tooltip>
  );
};
