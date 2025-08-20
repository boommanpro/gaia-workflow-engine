/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable complexity */

import React, { useEffect, useState } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Tooltip } from '@douyinfe/semi-ui';
import { IconCopyAdd, IconHandle, IconPlus, IconTreeTriangleDown } from '@douyinfe/semi-icons';

import { getComponentId, typeEditorUtils } from '../utils';
import { WidthIndent } from '../indent';
import { useAddType, usePasteAddType } from '../hooks/type-edit';
import { usePasteData } from '../hooks/paste-data';
import { useKeyVisible } from '../hooks/key-visible';
import { useDisabled } from '../hooks/disabled';
import {
  ShortcutContext,
  TypeEditorColumnConfig,
  TypeEditorColumnType,
  TypeEditorRowData,
} from '../../../types';
import { useTypeDefinitionManager } from '../../../contexts';
import {
  BaseIcon,
  KeyEditorContainer,
  KeyEditorInput,
  KeyViewContainer,
  KeyViewContent,
  KeyViewText,
} from './style';

const ViewRender: TypeEditorColumnConfig<IJsonSchema>['viewRender'] = ({
  rowData,
  onEditMode,
  readonly,
  onChange,
  onPaste,
  unOpenKeys,
  onChildrenVisibleChange,
  dragSource,
}) => {
  const { extraConfig } = rowData;

  const typeService = useTypeDefinitionManager();

  const config = typeService.getTypeBySchema(rowData.self);

  const disabled = useDisabled(TypeEditorColumnType.Key, rowData);

  const { hiddenDrag: originHiddenDrag } = extraConfig;

  const hiddenDrag = originHiddenDrag || readonly;

  const text = (
    <KeyViewText disabled={!!disabled} ellipsis={{ showTooltip: true }}>
      {typeEditorUtils.formateKey(rowData.key)}
    </KeyViewText>
  );

  const visibleNode = useKeyVisible(rowData, onChange, extraConfig);

  const handleAddType = useAddType(rowData, onChange);

  const draggable = !(rowData.cannotDrag || disabled || hiddenDrag);

  const { pasteData } = usePasteData();
  const handlePasteAddType = usePasteAddType(rowData, onChange, onPaste);

  if (config && config.canAddField?.(rowData)) {
    const disabledAdd = extraConfig.disabledAdd ? extraConfig.disabledAdd(rowData) : undefined;

    return (
      <KeyViewContainer
        id={getComponentId('key-text')}
        onClick={
          disabled
            ? undefined
            : () => {
                onEditMode();
              }
        }
      >
        {!hiddenDrag && (
          <BaseIcon draggable disabled={!draggable}>
            <IconHandle ref={draggable ? dragSource : undefined} />
          </BaseIcon>
        )}

        <WidthIndent width={rowData.level * 16} />
        <KeyViewContent>
          {rowData.childrenCount ? (
            <BaseIcon triangle isRotate={!unOpenKeys[rowData.id]}>
              <IconTreeTriangleDown
                size="small"
                onClick={(e) => {
                  onChildrenVisibleChange(rowData.id, !unOpenKeys[rowData.id]);
                  e.stopPropagation();
                }}
              />
            </BaseIcon>
          ) : (
            <WidthIndent width={12} />
          )}

          {disabled ? (
            <div style={{ flex: 1 }}>
              <Tooltip content={disabled}>{text}</Tooltip>
            </div>
          ) : (
            text
          )}

          {!readonly && (
            <>
              {disabledAdd ? (
                <Tooltip content={disabledAdd}>
                  <BaseIcon disabled>
                    <IconPlus id={getComponentId('add-field')} size="small" />
                  </BaseIcon>
                </Tooltip>
              ) : (
                <Tooltip content="add child field">
                  <BaseIcon>
                    <IconPlus
                      size="small"
                      onClick={handleAddType}
                      id={getComponentId('add-field')}
                    />
                  </BaseIcon>
                </Tooltip>
              )}
              {disabledAdd || pasteData.type === 'invalid' ? (
                <Tooltip
                  content={disabledAdd || 'Please confirm whether the clipboard value is correct'}
                >
                  <BaseIcon disabled>
                    <IconCopyAdd size="small" />
                  </BaseIcon>
                </Tooltip>
              ) : (
                <Tooltip content="paste as new child fields">
                  <BaseIcon>
                    <IconCopyAdd size="small" onClick={handlePasteAddType} />
                  </BaseIcon>
                </Tooltip>
              )}
            </>
          )}

          {extraConfig.editorVisible && visibleNode}
        </KeyViewContent>
      </KeyViewContainer>
    );
  }

  return (
    <KeyViewContainer
      id={getComponentId('key-text')}
      onClick={
        disabled
          ? undefined
          : () => {
              onEditMode();
            }
      }
    >
      {!hiddenDrag && (
        <BaseIcon draggable disabled={!draggable}>
          <IconHandle ref={draggable ? dragSource : undefined} />
        </BaseIcon>
      )}

      <WidthIndent width={(rowData.level + 1) * 16} />
      <KeyViewContent>
        {disabled ? <Tooltip content={disabled}>{text}</Tooltip> : text}
        {extraConfig.editorVisible && visibleNode}
      </KeyViewContent>
    </KeyViewContainer>
  );
};

const validate = (value: string, rowData: TypeEditorRowData<IJsonSchema>): string | undefined => {
  const res = rowData.extraConfig?.customValidateName?.(value);

  const lastValue = rowData.key;

  const parentTypeSchema = rowData.parent;

  if (value !== lastValue && parentTypeSchema?.properties?.[value]) {
    return 'The same key exists at the current level.';
  }
  if (res) {
    return res;
  }
};

const changeValue = ({
  rowData,
  value,
}: {
  rowData: TypeEditorRowData<IJsonSchema>;
  value: string;
}) => {
  const lastValue = rowData.key;

  const parentTypeSchema = rowData.parent;

  if (value !== lastValue) {
    if (parentTypeSchema && parentTypeSchema.properties) {
      parentTypeSchema.properties[value] = parentTypeSchema.properties[lastValue];
    }

    if (parentTypeSchema?.properties) {
      delete parentTypeSchema.properties[lastValue];
    }
  }
};

const EditRender: TypeEditorColumnConfig<IJsonSchema>['editRender'] = ({
  rowData,
  onChange,
  typeEditor,
  onError,
  onFieldChange,
  onViewMode,
}) => {
  const [value, setValue] = useState(typeEditorUtils.formateKey(rowData.key));

  useEffect(() => {
    typeEditor.editValue = value;
  }, [typeEditor, value]);

  return (
    <KeyEditorContainer>
      <WidthIndent
        style={{ background: 'var(--semi-color-fill-0)' }}
        width={
          (rowData.level + 2) * 14 +
          (2 * rowData.level - 1) +
          (rowData.extraConfig.hiddenDrag ? -16 : 0)
        }
      />
      <KeyEditorInput
        id={getComponentId('key-edit')}
        onChange={(v) => {
          setValue(v);
          typeEditor.dataSourceTouchedMap[rowData.id] = true;
          const res = validate(v, rowData);
          typeEditor.setErrorMsg(typeEditor.activePos, res);
          if (onError) {
            onError(res ? [res] : []);
          }
        }}
        autoFocus
        onBlur={(e) => {
          const oldValue = rowData.key;

          if (value && validate(value, rowData)) {
            typeEditor.blink.update(true);
            e.stopPropagation();
            e.preventDefault();
            return;
          }

          const newVal = typeEditorUtils.deFormateKey(value, oldValue);

          changeValue({ rowData, value: newVal });

          onFieldChange &&
            onFieldChange({
              type: TypeEditorColumnType.Key,
              oldValue,
              newValue: newVal,
            });

          if (onError) {
            onError([]);
          }
          onChange();
          onViewMode();
        }}
        value={value}
      />
    </KeyEditorContainer>
  );
};

const dealMove = (
  { rowData, value, onChange, typeEditor }: ShortcutContext<IJsonSchema>,
  cb: () => void
) => {
  const validateRes = validate(value, rowData);
  if (value && validateRes) {
    typeEditor.blink.update(true);
  } else {
    changeValue({
      value: typeEditorUtils.deFormateKey(value),
      rowData,
    });
    typeEditor.setErrorMsg(typeEditor.activePos);
    onChange();
    cb();
  }
};

export const keyColumnConfig: TypeEditorColumnConfig<IJsonSchema> = {
  type: TypeEditorColumnType.Key,
  label: 'Key',
  viewRender: ViewRender,
  width: 43,
  validateCell: (rowData, ctx) => {
    const key = typeEditorUtils.formateKey(rowData.key);
    if (!key) {
      return {
        level: 'warning',
        msg: 'Empty lines will not be saved.',
      };
    }

    if (ctx.customValidateName) {
      const customValidateRes = ctx.customValidateName(key);
      if (customValidateRes) {
        return {
          level: 'error',
          msg: customValidateRes,
        };
      }
      return;
    }

    if (validate(key, rowData)) {
      return {
        level: 'error',
        msg: validate(key, rowData),
      };
    }
  },
  shortcuts: {
    onEnter: (ctx) => {
      dealMove(ctx, () => {
        ctx.typeEditor.moveActivePosToNextLineWithAddLine(ctx.rowData);
      });
    },
    onTab: (ctx) => {
      dealMove(ctx, () => {
        ctx.typeEditor.moveActivePosToNextItem();
      });
    },
  },
  editRender: EditRender,
};
