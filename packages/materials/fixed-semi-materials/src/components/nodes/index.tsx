/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import metadata from '../metadata';
import { NodeWrap, NodeLabel, NodesWrap } from './styles';

function Node(props: { label: string; icon: JSX.Element; onClick: () => void }) {
  return (
    <NodeWrap onClick={props.onClick}>
      <div style={{ fontSize: 14 }}>{props.icon}</div>
      <NodeLabel>{props.label}</NodeLabel>
    </NodeWrap>
  );
}

const addings = metadata.nodes.filter((node) => node.type !== 'start');

export default function Nodes(props: { onSelect: (meta: any) => void }) {
  return (
    <NodesWrap style={{ width: 80 * 2 + 20 }}>
      {addings.map((n, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <Node key={i} icon={n.icon} label={n.label} onClick={() => props.onSelect?.(n)} />
      ))}
    </NodesWrap>
  );
}
