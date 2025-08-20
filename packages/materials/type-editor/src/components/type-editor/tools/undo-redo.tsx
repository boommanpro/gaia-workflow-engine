/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

// import { ShortcutsService, useIDEService } from '@flow-ide/client';
import React from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Button, Tooltip } from '@douyinfe/semi-ui';
import { IconRedo, IconUndo } from '@douyinfe/semi-icons';
// import { TypeEditorCommand, useMonitorData } from '@api-builder/base';

import { type TypeEditorMode, type TypeEditorRef } from '../type';
import { useMonitorData } from '../../../utils';

export const UndoRedo = <Mode extends TypeEditorMode, TypeSchema extends Partial<IJsonSchema>>({
  editor,
}: {
  editor: TypeEditorRef<Mode, TypeSchema>;
}) => {
  const { data: canUndo } = useMonitorData(editor.getOperator()?.canUndo);
  const { data: canRedo } = useMonitorData(editor.getOperator()?.canRedo);

  return (
    <>
      <Tooltip content="Undo">
        <Button
          disabled={!canUndo}
          icon={<IconUndo />}
          size="small"
          onClick={() => {
            editor?.undo();
          }}
        />
      </Tooltip>
      <Tooltip content="Redo">
        <Button
          size="small"
          icon={<IconRedo />}
          disabled={!canRedo}
          onClick={() => {
            editor?.redo();
          }}
        />
      </Tooltip>
    </>
  );
};
