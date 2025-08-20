/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import styled from 'styled-components';
import { IJsonSchema } from '@flowgram.ai/json-schema';

import { TypeEditorProvider } from '../../contexts';
import { type TypeEditorMode, type TypeEditorProp } from './type';
import { Table } from './table';
import { TypeEditorListener } from './hooks';

const Container = styled.div`
  position: relative;

  display: flex;
  flex-direction: column;
  gap: 4px;

  outline: none;

  table {
    table-layout: fixed;
  }
`;

export const TypeEditorTable = <
  Mode extends TypeEditorMode,
  TypeSchema extends Partial<IJsonSchema>
>(
  props: TypeEditorProp<Mode, TypeSchema>
) => (
  <TypeEditorProvider typeRegistryCreators={props.typeRegistryCreators}>
    <TypeEditorListener configs={props.viewConfigs}>
      <Container>
        <Table {...props} />
      </Container>
    </TypeEditorListener>
  </TypeEditorProvider>
);
