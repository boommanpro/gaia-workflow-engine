/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  FlowNodeEntity,
  FlowOperationService,
  useClientContext,
  usePlayground,
  useService,
} from '@flowgram.ai/fixed-layout-editor';
import { Dropdown } from '@douyinfe/semi-ui';
import { IconPlusCircle } from '@douyinfe/semi-icons';

import { nodeRegistries } from '../node-registries';

export const NodeAdder = (props: {
  from: FlowNodeEntity;
  to?: FlowNodeEntity;
  hoverActivated: boolean;
}) => {
  const { from, hoverActivated } = props;
  const playground = usePlayground();
  const context = useClientContext();
  const flowOperationService = useService(FlowOperationService) as FlowOperationService;

  const add = (addProps: any) => {
    const blocks = addProps.blocks ? addProps.blocks : undefined;
    const block = flowOperationService.addFromNode(from, {
      ...addProps,
      blocks,
    });
    setTimeout(() => {
      playground.scrollToView({
        bounds: block.bounds,
        scrollToCenter: true,
      });
    }, 10);
  };

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
                add(props);
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
