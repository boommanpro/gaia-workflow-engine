/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled from 'styled-components';

// 添加一个固定类名，用于选中该节点

export const LineStyle = styled.div`
  position: absolute;

  @keyframes flowingDash {
    to {
      stroke-dashoffset: -13;
    }
  }

  .dashed-line {
    stroke-dasharray: 8, 5;
  }

  .flowing-line {
    animation: flowingDash 0.5s linear infinite;
  }
`;
