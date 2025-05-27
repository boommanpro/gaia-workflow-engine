import React from 'react';

import { nanoid } from 'nanoid';
import { FieldArray } from '@flowgram.ai/free-layout-editor';
import Label from '@douyinfe/semi-ui/lib/es/form/label';
import { Button } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';

import { useIsSidebar } from '../../../hooks';
import { ConditionPort, GroupContainer } from './styles';
import { DEFAULT_CONDITION } from './constants';
import { ConditionGroup } from './ConditionGroup';

export function ConditionInputs() {
  const readonly = !useIsSidebar();
  const isSidebar = useIsSidebar();
  return (
    <FieldArray name="inputsValues.branches">
      {({ field }) => (
        <>
          {field.map((group, groupIndex) => (
            <React.Fragment key={`condition-group-${groupIndex}`}>
              <ConditionGroup
                group={group}
                readonly={readonly}
                groupIndex={groupIndex}
                onRemove={field.remove}
              />
            </React.Fragment>
          ))}
          {readonly && (
            <GroupContainer>
              <Label>否则</Label>
              <ConditionPort data-port-id="false" data-port-type="output" />
            </GroupContainer>
          )}

          {!readonly && (
            <div style={{ textAlign: 'right' }}>
              <Button
                theme="borderless"
                icon={<IconPlus />}
                onClick={() => {
                  field.append({
                    condition: {
                      logic: 1,
                      description: '规则说明',
                      conditions: [DEFAULT_CONDITION],
                    },
                  });
                }}
              >
                添加逻辑组
              </Button>
            </div>
          )}
        </>
      )}
    </FieldArray>
  );
}
