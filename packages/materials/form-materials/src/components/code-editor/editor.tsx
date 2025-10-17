/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useRef } from 'react';

import styled, { css } from 'styled-components';
import {
  ActiveLinePlaceholder,
  createRenderer,
  EditorProvider,
  InferValues,
} from '@flowgram.ai/coze-editor/react';
import preset, { type EditorAPI } from '@flowgram.ai/coze-editor/preset-code';
import { EditorView } from '@codemirror/view';

import { getSuffixByLanguageId } from './utils';

const OriginCodeEditor = createRenderer(preset, [
  EditorView.theme({
    '&.cm-focused': {
      outline: 'none',
    },
  }),
]);

const UIContainer = styled.div<{ $mini?: boolean }>`
  ${({ $mini }) =>
    $mini &&
    css`
      height: 24px;
    `}
`;

type Preset = typeof preset;
type Options = Partial<InferValues<Preset[number]>>;

export interface CodeEditorPropsType extends React.PropsWithChildren<{}> {
  value?: string;
  onChange?: (value: string) => void;
  languageId: 'python' | 'typescript' | 'shell' | 'json' | 'sql';
  theme?: 'dark' | 'light';
  placeholder?: string;
  activeLinePlaceholder?: string;
  readonly?: boolean;
  options?: Options;
  mini?: boolean;
}

export function BaseCodeEditor({
  value,
  onChange,
  languageId = 'python',
  theme = 'light',
  children,
  placeholder,
  activeLinePlaceholder,
  options,
  readonly,
  mini,
}: CodeEditorPropsType) {
  const editorRef = useRef<EditorAPI | null>(null);

  useEffect(() => {
    // listen to value change
    if (editorRef.current?.getValue() !== value) {
      editorRef.current?.setValue(String(value || ''));
    }
  }, [value]);

  return (
    <UIContainer $mini={mini}>
      <EditorProvider>
        <OriginCodeEditor
          defaultValue={String(value || '')}
          options={{
            uri: `file:///untitled${getSuffixByLanguageId(languageId)}`,
            languageId,
            theme,
            placeholder,
            readOnly: readonly,
            editable: !readonly,
            ...(mini
              ? {
                  lineNumbersGutter: false,
                  foldGutter: false,
                  minHeight: 24,
                }
              : {}),
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
    </UIContainer>
  );
}
