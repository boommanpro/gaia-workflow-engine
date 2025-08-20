/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Space, Tooltip } from '@douyinfe/semi-ui';

import {
  ToolbarConfig,
  ToolbarKey,
  type TypeEditorMode,
  type TypeEditorProp,
  type TypeEditorRef,
} from './type';
import { UndoRedo } from './tools/undo-redo';
import { CreateByData } from './tools/create-by-data';

export const ToolBar = <Mode extends TypeEditorMode, TypeSchema extends Partial<IJsonSchema>>({
  mode,
  editor,
  toolbarConfig = [],
}: TypeEditorProp<Mode, TypeSchema> & {
  editor?: TypeEditorRef<Mode, TypeSchema>;
}) => {
  const config = useMemo(() => {
    const res = new Map<string, ToolbarConfig>();

    toolbarConfig.forEach((tool) => {
      if (typeof tool === 'string') {
        res.set(tool, { type: tool });
      } else {
        res.set(tool.type, tool);
      }
    });
    return res;
  }, [toolbarConfig]);

  const importConfig = config.get(ToolbarKey.Import);

  return (
    <div style={{ width: '100%' }}>
      {editor && (
        <Space style={{ float: 'right' }}>
          <>
            {importConfig && (
              <>
                {importConfig.disabled ? (
                  <Tooltip content={importConfig.disabled}>
                    <CreateByData disabled mode={mode} editor={editor} />
                  </Tooltip>
                ) : (
                  <CreateByData
                    mode={mode}
                    customInputRender={importConfig.customInputRender}
                    editor={editor}
                  />
                )}
              </>
            )}
          </>
          {config.has(ToolbarKey.UndoRedo) && <UndoRedo editor={editor} />}
        </Space>
      )}
    </div>
  );
};
