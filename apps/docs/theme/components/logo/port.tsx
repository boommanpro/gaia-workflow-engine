/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';

import {
  useService,
  WorkflowHoverService,
  WorkflowLinesManager,
  WorkflowPortEntity,
} from '@flowgram.ai/free-layout-editor';

import { NodeColorMap } from './node-color';

export interface WorkflowPortRenderProps {
  entity: WorkflowPortEntity;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLDivElement>, port: WorkflowPortEntity) => void;
  /** 激活状态颜色 (linked/hovered) */
  primaryColor?: string;
  /** 默认状态颜色 */
  secondaryColor?: string;
  /** 错误状态颜色 */
  errorColor?: string;
  /** 背景颜色 */
  backgroundColor?: string;
}

export const PortRender: React.FC<WorkflowPortRenderProps> =
  // eslint-disable-next-line react/display-name
  React.memo<WorkflowPortRenderProps>((props: WorkflowPortRenderProps) => {
    const hoverService = useService<WorkflowHoverService>(WorkflowHoverService);
    const { entity } = props;
    const { relativePosition } = entity;
    const [targetElement, setTargetElement] = useState(entity.targetElement);
    const [posX, updatePosX] = useState(relativePosition.x);
    const [posY, updatePosY] = useState(relativePosition.y);
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
      // useEffect 时序问题可能导致 port.hasError 非最新，需重新触发一次 validate
      entity.validate();
      const dispose = entity.onEntityChange(() => {
        // 如果有挂载的节点，不需要更新位置信息
        if (entity.targetElement) {
          if (entity.targetElement !== targetElement) {
            setTargetElement(entity.targetElement);
          }
          return;
        }
        const newPos = entity.relativePosition;
        // 加上 round 避免点位抖动
        updatePosX(Math.round(newPos.x));
        updatePosY(Math.round(newPos.y));
      });
      const dispose2 = hoverService.onHoveredChange((id) => {
        setHovered(hoverService.isHovered(entity.id));
      });
      return () => {
        dispose.dispose();
        dispose2.dispose();
      };
    }, [hoverService, entity, targetElement]);

    // 构建 CSS 自定义属性用于颜色覆盖
    const colorStyles: Record<string, string> = {};
    if (props.primaryColor) {
      colorStyles['--g-workflow-port-color-primary'] = props.primaryColor;
    }
    if (props.secondaryColor) {
      colorStyles['--g-workflow-port-color-secondary'] = props.secondaryColor;
    }
    if (props.errorColor) {
      colorStyles['--g-workflow-port-color-error'] = props.errorColor;
    }
    if (props.backgroundColor) {
      colorStyles['--g-workflow-port-color-background'] = props.backgroundColor;
    }

    const content = (
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          marginTop: '-12px',
          marginLeft: '-12px',
          position: 'absolute',
          background: '#fff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          left: posX,
          top: posY,
        }}
        data-port-entity-id={entity.id}
        data-port-entity-type={entity.portType}
        data-testid="sdk.workflow.canvas.node.port"
      >
        <div
          style={{
            width: hovered ? '20px' : '16px',
            height: hovered ? '20px' : '16px',
            borderRadius: '50%',
            background: NodeColorMap[entity.node.id] ?? '#fff',
            transition: 'width 0.2s ease, height 0.2s ease',
          }}
        />
      </div>
    );
    return content;
  });
