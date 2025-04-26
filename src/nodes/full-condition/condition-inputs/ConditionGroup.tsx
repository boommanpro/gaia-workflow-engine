import React from 'react';

import { nanoid } from 'nanoid';
import { produce } from 'immer';
import Label from '@douyinfe/semi-ui/lib/es/form/label';
import { Button, Input, Select } from '@douyinfe/semi-ui';
import { IconCrossCircleStroked, IconPlus } from '@douyinfe/semi-icons';

import { GroupProps } from './types';
import { GroupContainer, GroupHeader, ConditionContainer, ConditionPort } from './styles';
import { LOGIC_OPTIONS, DEFAULT_CONDITION } from './constants';
import { ConditionItem } from './ConditionItem';

export const ConditionGroup: React.FC<GroupProps> = ({ group, readonly, groupIndex, onRemove }) => {
  const [isEditing, setIsEditing] = React.useState(false);

  // ... existing updateGroupField function ...

  const handleDoubleClick = () => {
    if (!readonly) {
      setIsEditing(true);
    }
  };

  const handleDescriptionChange = (value: string) => {
    updateGroupField(['condition', 'description'], value);
    setIsEditing(false);
  };
  const updateGroupField = (path: string[], value: any) => {
    group.onChange(
      produce(group.value, (draft: any) => {
        let current = draft;
        for (let i = 0; i < path.length - 1; i++) {
          current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
      })
    );
  };

  return (
    <GroupContainer>
      {/* Group Controls */}
      {!readonly && (
        <div style={{ right: '0px', position: 'absolute' }}>
          <Button
            theme="borderless"
            icon={<IconCrossCircleStroked />}
            onClick={() => onRemove(groupIndex)}
          />
        </div>
      )}
      {/* 简化描述展示逻辑：只读模式下只显示 Label */}
      {readonly ? (
        <Label>{group.value.condition.description}</Label>
      ) : isEditing ? (
        <Input
          defaultValue={group.value.condition.description}
          onBlur={(e) => handleDescriptionChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleDescriptionChange(e.currentTarget.value);
            }
          }}
          autoFocus
        />
      ) : (
        <div onDoubleClick={handleDoubleClick}>
          <Label>{group.value.condition.description}</Label>
        </div>
      )}
      {!readonly && (
        <ConditionContainer>
          <GroupHeader>
            {group.value.condition.conditions.length > 1 && (
              <Select
                value={group.value.condition.logic}
                onChange={(value) => updateGroupField(['condition', 'logic'], value)}
                disabled={readonly}
                style={{ width: '100px' }}
              >
                {LOGIC_OPTIONS.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
            )}
          </GroupHeader>

          <div>
            {group.value.condition.conditions.map((condition, index) => (
              <ConditionItem
                key={nanoid()}
                condition={condition}
                readonly={readonly}
                showRemove={group.value.condition.conditions.length > 1}
                index={index}
                onUpdate={(path, value) =>
                  updateGroupField(['condition', 'conditions', index, ...path], value)
                }
                onRemove={() => {
                  const updatedConditions = [...group.value.condition.conditions];
                  updatedConditions.splice(index, 1);
                  updateGroupField(['condition', 'conditions'], updatedConditions);
                }}
              />
            ))}
          </div>
        </ConditionContainer>
      )}

      {/* Add Condition Button */}
      {!readonly && (
        <div style={{ textAlign: 'right' }}>
          <Button
            theme="borderless"
            icon={<IconPlus />}
            onClick={() =>
              updateGroupField(
                ['condition', 'conditions'],
                [...group.value.condition.conditions, DEFAULT_CONDITION]
              )
            }
          >
            添加条件
          </Button>
        </div>
      )}
      <ConditionPort data-port-id={`true_${groupIndex}`} data-port-type="output" />
    </GroupContainer>
  );
};
