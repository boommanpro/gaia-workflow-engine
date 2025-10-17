/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { type IPoint } from '@flowgram.ai/utils';
import { LinePointLocation } from '@flowgram.ai/free-layout-core';
import { type WorkflowLineEntity } from '@flowgram.ai/free-layout-core';

/**
 * 箭头渲染器属性接口
 */
export interface ArrowRendererProps {
  /** 用于渐变的唯一ID */
  id: string;
  /** 箭头位置 */
  pos: IPoint;
  location: LinePointLocation;
  /** 描边宽度 */
  strokeWidth: number;
  /** 是否隐藏箭头 */
  hide?: boolean;
  /** 线条实体，提供更多上下文信息 */
  line: WorkflowLineEntity;
}

/**
 * 箭头渲染器组件类型
 */
export type ArrowRendererComponent = React.ComponentType<ArrowRendererProps>;
