/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import '@flowgram.ai/free-layout-editor/index.css';

import {
  useNodeRender,
  WorkflowNodeProps,
  WorkflowNodeRenderer,
} from '@flowgram.ai/free-layout-editor';

import { PortRender } from './port';
import { NodeBorderColorMap, NodeColorMap } from './node-color';

export const NodeRender = (props: WorkflowNodeProps) => {
  const { selected, node, ports } = useNodeRender();
  const nodeColor = NodeColorMap[node.id] ?? '#fff';
  const borderColor = NodeBorderColorMap[node.id] ?? '#fff';
  return (
    <WorkflowNodeRenderer
      style={{
        width: 60,
        minHeight: 150,
        height: 'auto',
        background: nodeColor,
        border: selected ? `2px solid ${borderColor}` : `2px solid ${nodeColor}`,
        borderRadius: 16,
        boxShadow: '0 2px 6px 0 rgba(0, 0, 0, 0.04), 0 4px 12px 0 rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        padding: 12,
        cursor: 'move',
      }}
      portStyle={{
        display: 'none',
      }}
      node={props.node}
    >
      {ports.map((p) => (
        <PortRender key={p.id} entity={p} />
      ))}
    </WorkflowNodeRenderer>
  );
};
