import React, { useMemo } from 'react';

import { TriggerRenderProps } from '@douyinfe/semi-ui/lib/es/treeSelect';
import { TreeNodeData } from '@douyinfe/semi-ui/lib/es/tree';
import { IconChevronDownStroked, IconIssueStroked } from '@douyinfe/semi-icons';

import { IJsonSchema } from '../../typings/json-schema';
import { useVariableTree } from './use-variable-tree';
import { UIRootTitle, UITag, UITreeSelect } from './styles';

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
  includeSchema,
  excludeSchema,
  hasError,
  triggerRender,
}: PropTypes) => {
  const treeData = useVariableTree({ includeSchema, excludeSchema });

  const treeValue = useMemo(() => {
    if (typeof value === 'string') {
      console.warn(
        'The Value of VariableSelector is a string, it should be an ARRAY. \n',
        'Please check the value of VariableSelector \n'
      );
      return value;
    }
    return value?.join('.');
  }, [value]);

  const renderIcon = (icon: string | JSX.Element) => {
    if (typeof icon === 'string') {
      return <img style={{ marginRight: 8 }} width={12} height={12} src={icon} />;
    }

    return icon;
  };

  return (
    <>
      <UITreeSelect
        dropdownMatchSelectWidth={false}
        disabled={readonly}
        treeData={treeData}
        size="small"
        value={treeValue}
        clearIcon={null}
        $error={hasError}
        style={style}
        validateStatus={hasError ? 'error' : undefined}
        onChange={(_, _config) => {
          onChange((_config as TreeNodeData).keyPath as string[]);
        }}
        renderSelectedItem={(_option: TreeNodeData) => {
          if (!_option?.keyPath) {
            return (
              <UITag
                prefixIcon={<IconIssueStroked />}
                color="amber"
                closable={!readonly}
                onClose={() => onChange(undefined)}
              >
                {config?.notFoundContent ?? 'Undefined'}
              </UITag>
            );
          }

          return (
            <UITag
              prefixIcon={renderIcon(_option.rootMeta?.icon || _option?.icon)}
              closable={!readonly}
              onClose={() => onChange(undefined)}
            >
              <UIRootTitle>
                {_option.rootMeta?.title ? `${_option.rootMeta?.title} -` : null}
              </UIRootTitle>
              {_option.label}
            </UITag>
          );
        }}
        showClear={false}
        arrowIcon={<IconChevronDownStroked size="small" />}
        triggerRender={triggerRender}
        placeholder={config?.placeholder ?? 'Select Variable...'}
      />
    </>
  );
};
