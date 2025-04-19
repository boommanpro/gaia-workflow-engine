import React from 'react';

import { Dropdown, Tag } from '@douyinfe/semi-ui';

import { VariableTypeIcons } from '../plugins/sync-variable-plugin/icons';

export interface TypeSelectorProps {
  value?: string;
  disabled?: boolean;
  onChange?: (value?: string) => void;
  style?: React.CSSProperties;
}

const dropdownMenus = ['object', 'boolean', 'array', 'string', 'integer', 'number'];

export const TypeSelector: React.FC<TypeSelectorProps> = (props) => {
  const { value, disabled } = props;
  const icon = VariableTypeIcons[value as any];
  if (disabled) {
    return (
      <Tag color="white" style={props.style}>
        {icon}
      </Tag>
    );
  }

  return (
    <Dropdown
      trigger="hover"
      position="bottomRight"
      render={
        <Dropdown.Menu>
          {dropdownMenus.map((key) => (
            <Dropdown.Item
              key={key}
              onClick={() => {
                props.onChange?.(key);
              }}
            >
              {VariableTypeIcons[key]}
              <span style={{ paddingLeft: '4px' }}>{key}</span>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      }
    >
      <Tag
        color="white"
        style={props.style}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        {icon}
      </Tag>
    </Dropdown>
  );
};
