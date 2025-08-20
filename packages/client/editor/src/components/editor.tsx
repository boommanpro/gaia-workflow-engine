/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { EditorProps } from '../preset';
import { EditorRenderer } from './editor-renderer';
import { EditorProvider } from './editor-provider';

/**
 * 画布编辑器
 * @param props
 * @constructor
 */
export const Editor: React.FC<EditorProps> = (props: EditorProps) => {
  const { children, ...otherProps } = props;
  return (
    <EditorProvider {...otherProps}>
      <EditorRenderer>{children}</EditorRenderer>
    </EditorProvider>
  );
};
