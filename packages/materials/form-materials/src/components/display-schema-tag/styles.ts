/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled from 'styled-components';
import { Tag } from '@douyinfe/semi-ui';

export const PopoverContent = styled.div`
  padding: 10px;
`;

export const StyledTag = styled(Tag)`
  padding: 4px;

  .tag-icon {
    width: 12px;
    height: 12px;
  }
`;

export const TitleSpan = styled.span`
  display: inline-block;
  margin-left: 4px;
  margin-top: -1px;
  overflow: hidden;
  text-overflow: ellipsis;
`;
