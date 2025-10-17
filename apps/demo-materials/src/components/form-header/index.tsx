/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';

import { WorkflowNodeEntity, useCurrentEntity } from '@flowgram.ai/free-layout-editor';

import { getIcon } from './utils';
import { TitleInput } from './title-input';
import { Header, HeaderInner } from './styles';

export function FormHeader() {
  const node: WorkflowNodeEntity = useCurrentEntity();
  const [titleEdit, updateTitleEdit] = useState<boolean>(false);

  return (
    <Header>
      <HeaderInner>
        {getIcon(node)}
        <TitleInput updateTitleEdit={updateTitleEdit} titleEdit={titleEdit} />
      </HeaderInner>
    </Header>
  );
}
