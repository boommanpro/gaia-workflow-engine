/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useRef } from 'react';

import {
  ActiveLinePlaceholder,
  createRenderer,
  EditorProvider,
  InferValues,
} from '@coze-editor/editor/react';
import preset, { type EditorAPI } from '@coze-editor/editor/preset-code';
import { EditorView } from '@codemirror/view';

import { getSuffixByLanguageId } from './utils';
import { initTsWorker } from './language-features';

import './theme';
import './language-features';

const OriginCodeEditor = createRenderer(preset, [
  EditorView.theme({
    '&.cm-focused': {
      outline: 'none',
    },
  }),
]);

type Preset = typeof preset;
type Options = Partial<InferValues<Preset[number]>>;

export interface CodeEditorPropsType extends React.PropsWithChildren<{}> {
  value?: string;
  onChange?: (value: string) => void;
  languageId: 'python' | 'typescript' | 'shell' | 'json';
  theme?: 'dark' | 'light';
  placeholder?: string;
  activeLinePlaceholder?: string;
  readonly?: boolean;
  options?: Options;
}

export function CodeEditor({
  value,
  onChange,
  languageId = 'python',
  theme = 'light',
  children,
  placeholder,
  activeLinePlaceholder,
  options,
  readonly,
}: CodeEditorPropsType) {
  const editorRef = useRef<EditorAPI | null>(null);

  useEffect(() => {
    if (languageId === 'typescript') {
      initTsWorker();
    }
  }, [languageId]);

  useEffect(() => {
    // listen to value change
    if (editorRef.current?.getValue() !== value) {
      editorRef.current?.setValue(String(value || ''));
    }
  }, [value]);

  return (
    <EditorProvider>
      <OriginCodeEditor
        defaultValue={value}
        options={{
          uri: `file:///untitled${getSuffixByLanguageId(languageId)}`,
          languageId,
          theme,
          placeholder,
          readOnly: readonly,
          editable: !readonly,
          ...(options || {}),
        }}
        didMount={(editor: EditorAPI) => {
          editorRef.current = editor;
        }}
        onChange={(e) => onChange?.(e.value)}
      >
        {activeLinePlaceholder && (
          <ActiveLinePlaceholder>{activeLinePlaceholder}</ActiveLinePlaceholder>
        )}
        {children}
      </OriginCodeEditor>
    </EditorProvider>
  );
}
