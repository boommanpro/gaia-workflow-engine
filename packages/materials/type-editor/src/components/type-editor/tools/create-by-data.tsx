/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { FC, useCallback, useMemo, useState } from 'react';

import { debounce } from 'lodash-es';
import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Button, Divider, Empty, Modal, Space, TextArea } from '@douyinfe/semi-ui';
import { IllustrationFailure, IllustrationFailureDark } from '@douyinfe/semi-illustrations';

import { typeEditorUtils } from '../utils';
import { TypeEditorTable } from '../type-editor';
import { type TypeEditorMode, type TypeEditorRef, type TypeEditorValue } from '../type';
import { modeValueConfig } from '../mode';
import { DataTransform } from './style';

export const CreateByData = <Mode extends TypeEditorMode, TypeSchema extends Partial<IJsonSchema>>({
  mode,
  disabled,
  customInputRender: CustomInputRender,
  editor,
}: {
  editor: TypeEditorRef<Mode, TypeSchema>;
  mode: Mode;
  disabled?: boolean;
  customInputRender?: FC<{ value: string; onChange: (newVal: string) => void }>;
}) => {
  const modeConfig = useMemo(() => modeValueConfig.find((v) => v.mode === mode)!, [mode]);

  const [visible, setVisible] = useState(false);

  const [typeEditorValue, setTypeEditorValue] = useState<TypeEditorValue<Mode, TypeSchema>>(
    modeConfig.toolConfig.createByData.genDefaultValue() as TypeEditorValue<Mode, TypeSchema>
  );
  const [errorEmpty, setErrorEmpty] = useState(false);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTypeEditorValue(
      modeConfig.toolConfig.createByData.genDefaultValue() as TypeEditorValue<Mode, TypeSchema>
    );
  }, [modeConfig]);

  const handleOk = useCallback(async () => {
    if (editor) {
      editor.setValue(typeEditorValue);
      handleClose();
    }
  }, [handleClose, typeEditorValue, editor]);

  const onChange = debounce((newVal: string) => {
    const parsedValue = typeEditorUtils.jsonParse(newVal);
    const error =
      newVal && !(parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue));

    if (!error) {
      setTypeEditorValue(
        modeConfig.commonValueToSubmitValue(parsedValue) as TypeEditorValue<Mode, TypeSchema>
      );
      setErrorEmpty(false);
    } else if (parsedValue) {
      setErrorEmpty(true);
    }
  }, 500);

  return (
    <div>
      <Button disabled={disabled} size="small" onClick={() => setVisible(true)}>
        Import from JSON
      </Button>
      <Modal
        okText={`Import`}
        width={960}
        okButtonProps={{}}
        cancelText="Cancel"
        title="Import from JSON"
        visible={visible}
        onOk={handleOk}
        onCancel={handleClose}
      >
        <DataTransform>
          <div style={{ height: '100%', flex: 1 }}>
            {CustomInputRender ? (
              <CustomInputRender value="{}" onChange={onChange} />
            ) : (
              <TextArea defaultValue="{}" onChange={onChange} />
            )}
          </div>
          <Divider layout="vertical" style={{ height: '100%' }} />
          <Space align="start" vertical style={{ height: '100%', flex: 1 }}>
            <div style={{ height: '100%', flex: 1, overflowY: 'scroll' }}>
              <TypeEditorTable
                readonly
                mode={mode}
                forceUpdate
                // TODO:
                // tableClassName={s['tool-table']}
                value={errorEmpty ? undefined : typeEditorValue}
                customEmptyNode={
                  errorEmpty ? (
                    <Empty
                      style={{ marginTop: 40 }}
                      image={<IllustrationFailure style={{ width: 100, height: 100 }} />}
                      darkModeImage={
                        <IllustrationFailureDark style={{ width: 100, height: 100 }} />
                      }
                      description="Invalid value"
                    />
                  ) : undefined
                }
                viewConfigs={modeConfig.toolConfig.createByData.viewConfig}
              />
            </div>
          </Space>
        </DataTransform>
      </Modal>
    </div>
  );
};
