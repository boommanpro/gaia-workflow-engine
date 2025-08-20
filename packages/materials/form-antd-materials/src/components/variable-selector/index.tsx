'use client';
import React from 'react';

import type { TreeSelectProps, TreeNodeProps } from 'antd';
import { DownOutlined } from '@ant-design/icons';

import { IJsonSchema } from '../../typings/json-schema';
import { useVariableTree } from './use-variable-tree';
import { UITreeSelect } from './styles';

interface TriggerRenderProps {
  value: string[];
}

interface PropTypes {
  value?: string[];
  config?: {
    placeholder?: string;
    notFoundContent?: string;
  };
  onChange: (value?: string[]) => void;
  includeSchema?: IJsonSchema | IJsonSchema[];
  excludeSchema?: IJsonSchema | IJsonSchema[];
  readonly?: boolean;
  allowClear?: boolean;
  hasError?: boolean;
  style?: React.CSSProperties;
  triggerRender?: (props: TriggerRenderProps) => React.ReactNode;
}

export type VariableSelectorProps = PropTypes;

export const VariableSelector = ({
  value,
  config = {},
  onChange,
  style,
  readonly = false,
  allowClear = false,
  includeSchema,
  excludeSchema,
  hasError,
  triggerRender,
}: PropTypes) => {
  const treeData = useVariableTree({ includeSchema, excludeSchema });

  const onPopupScroll: TreeSelectProps['onPopupScroll'] = (e) => {
    console.log('onPopupScroll', e);
  };

  return (
    <UITreeSelect
      value={value}
      styles={{
        popup: { root: { maxHeight: 400, minWidth: 230, overflow: 'auto' } },
      }}
      style={style}
      treeDefaultExpandAll
      onChange={onChange}
      treeData={treeData}
      onPopupScroll={onPopupScroll}
      treeIcon={true}
      allowClear={allowClear}
      suffixIcon={triggerRender && value ? triggerRender({ value }) : undefined}
      switcherIcon={(props: TreeNodeProps) => (
        <DownOutlined
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        />
      )}
    />
  );
};
