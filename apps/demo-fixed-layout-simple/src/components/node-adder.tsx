/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeEntity, useClientContext, usePlayground } from '@flowgram.ai/fixed-layout-editor';
import { Dropdown } from '@douyinfe/semi-ui';
import { IconPlusCircle } from '@douyinfe/semi-icons';

import { nodeRegistries } from '../node-registries';
import { useAddNode } from '../hooks/use-add-node';

export const NodeAdder = (props: {
  from: FlowNodeEntity;
  to?: FlowNodeEntity;
  hoverActivated: boolean;
}) => {
  const { from, hoverActivated } = props;
  const playground = usePlayground();
  const context = useClientContext();

  const { handleAdd } = useAddNode();

  if (playground.config.readonlyOrDisabled) return null;

  return (
    <Dropdown
      render={
        <Dropdown.Menu>
          {nodeRegistries.map((registry) => (
            <Dropdown.Item
              key={registry.type}
              onClick={() => {
                const props = registry?.onAdd(context, from);
                handleAdd(props, from);
              }}
            >
              {registry.type}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      }
    >
      <div
        style={{
          width: hoverActivated ? 15 : 6,
          height: hoverActivated ? 15 : 6,
          backgroundColor: 'rgb(143, 149, 158)',
          color: '#fff',
          borderRadius: '50%',
          cursor: 'pointer',
        }}
      >
        {hoverActivated ? (
          <IconPlusCircle
            style={{
              color: '#3370ff',
              backgroundColor: '#fff',
              borderRadius: 15,
            }}
          />
        ) : null}
      </div>
    </Dropdown>
  );
};
