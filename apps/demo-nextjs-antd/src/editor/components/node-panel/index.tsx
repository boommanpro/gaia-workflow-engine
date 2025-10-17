/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import './index.scss';
import { FC } from 'react';

import { Popover } from 'antd';
import { NodePanelRenderProps } from '@flowgram.ai/free-node-panel-plugin';

import { NodePlaceholder } from './node-placeholder';
import { NodeList } from './node-list';

export const NodePanel: FC<NodePanelRenderProps> = (props) => {
  const { onSelect, position, onClose, panelProps } = props;
  // @ts-ignore
  const { enableNodePlaceholder } = panelProps;

  return (
    <Popover
      trigger="click"
      visible={true}
      onVisibleChange={(v) => (v ? null : onClose())}
      content={<NodeList onSelect={onSelect} visibleNodeRegistries={[]} />}
      getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
      placement="right"
      // popupAlign={{ offset: [30, 0] }}
      overlayStyle={{
        padding: 0,
      }}
    >
      <div
        style={
          enableNodePlaceholder
            ? {
                position: 'absolute',
                top: position.y - 61.5,
                left: position.x,
                width: 360,
                height: 100,
              }
            : {
                position: 'absolute',
                top: position.y,
                left: position.x,
                width: 0,
                height: 0,
              }
        }
      >
        {enableNodePlaceholder && <NodePlaceholder />}
      </div>
    </Popover>
  );
};
