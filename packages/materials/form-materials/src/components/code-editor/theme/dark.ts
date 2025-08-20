/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { createTheme, tags as t } from '@coze-editor/editor/preset-code';
import { type Extension } from '@codemirror/state';

const colors = {
  background: '#151B27',
  // syntax
  comment: '#FFFFFF63',
  key: '#39E5D7',
  string: '#FF94D2',
  number: '#FF9933',
  boolean: '#78B0FF',
  null: '#78B0FF',
  separator: '#FFFFFFC9',
};

export const darkTheme: Extension = createTheme({
  variant: 'dark',
  settings: {
    background: colors.background,
    foreground: '#fff',
    caret: '#AEAFAD',
    selection: '#d9d9d942',
    gutterBackground: colors.background,
    gutterForeground: '#FFFFFF63',
    gutterBorderColor: 'transparent',
    gutterBorderWidth: 0,
    lineHighlight: '#272e3d36',
    bracketColors: ['#FFEF61', '#DD99FF', '#78B0FF'],
    tooltip: {
      backgroundColor: '#363D4D',
      color: '#fff',
      border: 'none',
    },
    link: {
      color: '#4daafc',
    },
    completionItemHover: {
      backgroundColor: '#FFFFFF0F',
    },
    completionItemSelected: {
      backgroundColor: '#FFFFFF17',
    },
    completionItemIcon: {
      color: '#FFFFFFC9',
    },
    completionItemLabel: {
      color: '#FFFFFFC9',
    },
    completionItemInfo: {
      color: '#FFFFFFC9',
    },
    completionItemDetail: {
      color: '#FFFFFF63',
    },
  },
  styles: [
    // json
    {
      tag: t.comment,
      color: colors.comment,
    },
    {
      tag: [t.propertyName],
      color: colors.key,
    },
    {
      tag: [t.string],
      color: colors.string,
    },
    {
      tag: [t.number],
      color: colors.number,
    },
    {
      tag: [t.bool],
      color: colors.boolean,
    },
    {
      tag: [t.null],
      color: colors.null,
    },
    {
      tag: [t.separator],
      color: colors.separator,
    },

    // markdown
    {
      tag: [t.heading],
      color: '#6b6bff',
    },
    {
      tag: [t.processingInstruction],
      color: '#6b6bff',
    },

    // shell
    // curl
    {
      tag: [t.standard(t.variableName)],
      color: '#3BEB84',
    },
    // -X
    {
      tag: [t.attributeName],
      color: '#FF9933',
    },
    // url in string (includes quotes), e.g. "https://..."
    {
      tag: [t.special(t.string)],
      color: '#78B0FF',
    },
  ],
});
