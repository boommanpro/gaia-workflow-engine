/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeEntity } from '@flowgram.ai/fixed-layout-editor';
import { Typography } from '@douyinfe/semi-ui';

interface PropsType {
  node: FlowNodeEntity;
}

const Text = Typography.Text;

export function AgentLabel(props: PropsType) {
  const { node } = props;

  let label = 'Default';

  switch (node.flowNodeType) {
    case 'agentMemory':
      label = 'Memory';
      break;
    case 'agentLLM':
      label = 'LLM';
      break;
    case 'agentTools':
      label = 'Tools';
  }

  return (
    <Text
      ellipsis={{ showTooltip: true }}
      style={{
        maxWidth: 65,
        fontSize: 12,
        textAlign: 'center',
        padding: '2px',
        backgroundColor: 'var(--g-editor-background)',
        color: '#8F959E',
      }}
    >
      {label}
    </Text>
  );
}
