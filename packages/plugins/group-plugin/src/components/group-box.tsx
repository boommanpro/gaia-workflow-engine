/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable react/prop-types */
import { useEffect, type CSSProperties } from 'react';
import React from 'react';

import { FlowGroupController } from '@flowgram.ai/document';
import type { Rectangle } from '@flowgram.ai/utils';

import { IGroupBox } from '../type';
import { useHover } from './hooks';

export const GroupBox: IGroupBox = props => {
  const { groupNode } = props;
  const groupController = FlowGroupController.create(groupNode)!;
  const bounds: Rectangle = groupController.bounds;
  const { hover, ref } = useHover();

  const positionStyle: CSSProperties = {
    position: 'absolute',
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
  };

  const defaultBackgroundStyle: CSSProperties = {
    borderRadius: 10,
    zIndex: -1,
    outline: `${hover ? 3 : 1}px solid rgb(97, 69, 211)`,
    backgroundColor: 'rgb(236 233 247)',
  };

  const backgroundStyle = props.backgroundStyle
    ? props.backgroundStyle(groupController)
    : defaultBackgroundStyle;

  useEffect(() => {
    groupController.hovered = hover;
  }, [hover]);

  if (!groupController || groupController.collapsed) {
    return <></>;
  }

  return (
    <div className="gedit-group-box" data-group-id={groupNode.id}>
      <div
        className="gedit-group-background"
        ref={ref}
        style={{
          ...positionStyle,
          ...backgroundStyle,
        }}
      />
    </div>
  );
};
