/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { TypeEditorProvider } from '../../contexts';
import { type Props } from './type';
import { CascaderV2 } from './cascader-v2';

export const TypeSelector = <TypeSchema extends Partial<IJsonSchema>>(props: Props<TypeSchema>) => {
  const [init, setInit] = useState(false);
  return (
    <TypeEditorProvider
      typeRegistryCreators={props.typeRegistryCreators}
      onInit={() => setInit(true)}
    >
      {init ? <CascaderV2 {...(props as unknown as Props<IJsonSchema>)} /> : <></>}
    </TypeEditorProvider>
  );
};
