/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */
import React, { FC } from 'react';

import styled from 'styled-components';
import { NodePanelRenderProps } from '@flowgram.ai/free-node-panel-plugin';
import {
  useClientContext,
  WorkflowNodeEntity,
  WorkflowPortEntity,
} from '@flowgram.ai/free-layout-editor';

import { canContainNode } from '../../utils';
import { FlowNodeRegistry } from '../../typings';
import {
  NODE_CATEGORY_LABELS,
  NodeCategory,
  categoryColorVar,
  getNodeVisual,
} from '../../nodes/node-visuals';
import { getNodeLabel } from '../../nodes/i18n';
import { nodeRegistries } from '../../nodes';

const NodeWrap = styled.div`
  width: 100%;
  height: 32px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 19px;
  padding: 0 10px;
  &:hover {
    background-color: var(--ge-surface-2, hsl(252deg 62% 55% / 9%));
  }
`;

const NodeLabel = styled.div`
  font-size: 12px;
  margin-left: 10px;
`;

/** 分组容器（2026-11-04 验收：添加节点面板支持分组，批注入列） */
const GroupWrap = styled.div`
  & + & {
    margin-top: 6px;
  }
`;
const GroupHeader = styled.div`
  font-size: 11px;
  color: var(--ge-text-2, #7b8090);
  padding: 2px 6px 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--ge-border, #e5e6ee);
  }
`;
const GroupGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 6px;
`;

interface NodeProps {
  label: string;
  icon: JSX.Element;
  onClick: React.MouseEventHandler<HTMLDivElement>;
  disabled: boolean;
}

function Node(props: NodeProps) {
  return (
    <NodeWrap
      data-testid={`demo-free-node-list-${props.label}`}
      onClick={props.disabled ? undefined : props.onClick}
      style={props.disabled ? { opacity: 0.3 } : {}}
    >
      <div style={{ fontSize: 14, display: 'flex' }}>{props.icon}</div>
      <NodeLabel>{props.label}</NodeLabel>
    </NodeWrap>
  );
}

const NodesWrap = styled.div`
  max-height: 500px;
  overflow: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`;

interface NodeListProps {
  onSelect: NodePanelRenderProps['onSelect'];
  fromPort?: WorkflowPortEntity; // 从哪个端口添加 From which port to add
  containerNode?: WorkflowNodeEntity;
}

const GROUP_ORDER: NodeCategory[] = ['flow', 'model', 'logic', 'data', 'integration', 'canvas'];

export const NodeList: FC<NodeListProps> = (props) => {
  const { onSelect, containerNode } = props;
  const context = useClientContext();
  const handleClick = (e: React.MouseEvent, registry: FlowNodeRegistry) => {
    const json = registry.onAdd?.(context);
    onSelect({
      nodeType: registry.type as string,
      selectEvent: e,
      nodeJSON: json,
    });
  };

  const usable = nodeRegistries
    // 批注（comment）入列：工具栏批注按钮移除后，批注从「添加节点」与左侧面板添加
    .filter((register) => register.meta.nodePanelVisible !== false || register.type === 'comment')
    .filter((register) => {
      if (register.meta.onlyInContainer) {
        return register.meta.onlyInContainer === containerNode?.flowNodeType;
      }
      /**
       * 循环节点无法嵌套循环节点
       * Loop node cannot nest loop node
       */
      if (containerNode && !canContainNode(register.type, containerNode.flowNodeType)) {
        return false;
      }
      return true;
    });

  const groups = GROUP_ORDER.map((category) => ({
    category,
    items: usable.filter((reg) => getNodeVisual(reg.type).category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <NodesWrap style={{ width: 80 * 2 + 20 + 12 }}>
      {groups.map(({ category, items }) => (
        <GroupWrap key={category}>
          <GroupHeader>{NODE_CATEGORY_LABELS[category]}</GroupHeader>
          <GroupGrid>
            {items.map((registry) => {
              const visual = getNodeVisual(registry.type);
              const { Icon } = visual;
              return (
                <Node
                  key={registry.type}
                  disabled={!(registry.canAdd?.(context) ?? true)}
                  icon={
                    <span
                      className="gaia-node-chip"
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        color: categoryColorVar(visual.category),
                      }}
                    >
                      <Icon size={12} />
                    </span>
                  }
                  label={getNodeLabel(String(registry.type))}
                  onClick={(e) => handleClick(e, registry)}
                />
              );
            })}
          </GroupGrid>
        </GroupWrap>
      ))}
    </NodesWrap>
  );
};
