/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { createTheme, tags as t } from '@coze-editor/editor/preset-code';
import { type Extension } from '@codemirror/state';

const colors = {
  background: '#F7F7FC',
  // syntax
  comment: '#000A298A',
  key: '#00818C',
  string: '#D1009D',
  number: '#C74200',
  boolean: '#2B57D9',
  null: '#2B57D9',
  separator: '#0F1529D1',
};

export const lightTheme: Extension = createTheme({
  variant: 'light',
  settings: {
    background: '#fff',
    foreground: '#000',
    caret: '#000',
    selection: '#d9d9d9',
    gutterBackground: '#f0f0f0',
    gutterForeground: '#666',
    gutterBorderColor: 'transparent',
    gutterBorderWidth: 0,
    lineHighlight: '#e1e1e180',
    bracketColors: ['#FFD700', '#DD99FF', '#78B0FF'],
    tooltip: {
      backgroundColor: '#f0f0f0',
      color: '#000',
      border: '1px solid #ccc',
    },
    link: {
      color: '#007bff',
    },
    completionItemHover: {
      backgroundColor: '#f0f0f0',
    },
    completionItemSelected: {
      backgroundColor: '#e0e0e0',
    },
    completionItemIcon: {
      color: '#333',
    },
    completionItemLabel: {
      color: '#333',
    },
    completionItemInfo: {
      color: '#333',
    },
    completionItemDetail: {
      color: '#666',
    },
  },
  styles: [
    // JSON
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
      color: '#3e76ef',
    },
    {
      tag: [t.processingInstruction],
      color: '#3e76ef',
    },

    // shell
    // curl
    {
      tag: [t.standard(t.variableName)],
      color: '#00804A',
    },
    // -X
    {
      tag: [t.attributeName],
      color: '#C74200',
    },
    // url in string (includes quotes), e.g. "https://..."
    {
      tag: [t.special(t.string)],
      color: '#2B57D9',
    },
  ],
});
