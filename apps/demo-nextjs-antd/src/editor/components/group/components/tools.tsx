/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FC } from 'react';

import { HolderOutlined } from '@ant-design/icons';

import { GroupTitle } from './title';
import { GroupColor } from './color';

export const GroupTools: FC = () => (
  <div className="workflow-group-tools">
    <HolderOutlined className="workflow-group-tools-drag" />
    <GroupTitle />
    <GroupColor />
  </div>
);
