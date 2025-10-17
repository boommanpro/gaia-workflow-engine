/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useImperativeHandle, useState } from 'react';

import { noop } from 'lodash-es';
import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Space } from '@douyinfe/semi-ui';

import { fixedTSForwardRef } from './utils';
import { TypeEditorTable } from './type-editor';
import { TypeEditorMode, TypeEditorProp, TypeEditorRef } from './type';
import { ToolBar } from './tool-bar';
export * from './type';
export { columnConfigs as TypeEditorColumnConfigs } from './columns';

const TypeEditorContainer = <Mode extends TypeEditorMode, TypeSchema extends Partial<IJsonSchema>>(
  props: TypeEditorProp<Mode, TypeSchema>,
  ref: React.Ref<TypeEditorRef<Mode, TypeSchema>>
) => {
  const [instance, setInstance] = useState<TypeEditorRef<Mode, TypeSchema>>();

  useImperativeHandle(ref, () => ({
    getContainer: () => instance?.getContainer(),
    setValue: instance?.setValue || noop,
    getService: instance?.getService || (() => undefined),
    undo: instance?.undo || noop,
    redo: instance?.redo || noop,
    getValue() {
      return instance?.getValue();
    },
    getOperator() {
      return instance?.getOperator();
    },
  }));

  return (
    <Space spacing={4} vertical>
      {instance && <ToolBar {...props} editor={instance} />}
      <TypeEditorTable
        onInit={(editor) => {
          setInstance(editor.current);
        }}
        {...props}
      />
    </Space>
  );
};

export const TypeEditor = fixedTSForwardRef(TypeEditorContainer);
