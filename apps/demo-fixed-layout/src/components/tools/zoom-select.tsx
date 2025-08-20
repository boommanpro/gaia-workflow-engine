/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';

import { usePlaygroundTools } from '@flowgram.ai/fixed-layout-editor';
import { Divider, Dropdown } from '@douyinfe/semi-ui';

import { SelectZoom } from './styles';

export const ZoomSelect = () => {
  const tools = usePlaygroundTools({ maxZoom: 2, minZoom: 0.25 });
  const [dropDownVisible, openDropDown] = useState(false);
  return (
    <Dropdown
      position="top"
      trigger="custom"
      visible={dropDownVisible}
      onClickOutSide={() => openDropDown(false)}
      render={
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => tools.zoomin()}>Zoomin</Dropdown.Item>
          <Dropdown.Item onClick={() => tools.zoomout()}>Zoomout</Dropdown.Item>
          <Divider layout="horizontal" />
          <Dropdown.Item onClick={() => tools.updateZoom(0.5)}>50%</Dropdown.Item>
          <Dropdown.Item onClick={() => tools.updateZoom(1)}>100%</Dropdown.Item>
          <Dropdown.Item onClick={() => tools.updateZoom(1.5)}>150%</Dropdown.Item>
          <Dropdown.Item onClick={() => tools.updateZoom(2.0)}>200%</Dropdown.Item>
        </Dropdown.Menu>
      }
    >
      <SelectZoom onClick={() => openDropDown(true)}>{Math.floor(tools.zoom * 100)}%</SelectZoom>
    </Dropdown>
  );
};
