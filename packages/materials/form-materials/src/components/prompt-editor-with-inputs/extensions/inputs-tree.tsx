/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';

import { Popover } from '@douyinfe/semi-ui';
import {
  Mention,
  MentionOpenChangeEvent,
  getCurrentMentionReplaceRange,
  useEditor,
  PositionMirror,
} from '@coze-editor/editor/react';
import { EditorAPI } from '@coze-editor/editor/preset-prompt';

import { IFlowValue } from '@/typings';

import { InputsPicker } from '../inputs-picker';

export function InputsTree({ inputsValues }: { inputsValues: Record<string, IFlowValue> }) {
  const [posKey, setPosKey] = useState('');
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState(-1);
  const editor = useEditor<EditorAPI>();

  function insert(variablePath: string) {
    const range = getCurrentMentionReplaceRange(editor.$view.state);

    if (!range) {
      return;
    }

    /**
     * When user input {{xxxx}}, {{{xxx}}}(more brackets if possible), replace all brackets with {{xxxx}}
     */
    let { from, to } = range;
    while (editor.$view.state.doc.sliceString(from - 1, from) === '{') {
      from--;
    }
    while (editor.$view.state.doc.sliceString(to, to + 1) === '}') {
      to++;
    }

    editor.replaceText({
      ...range,
      text: '{{' + variablePath + '}}',
    });

    setVisible(false);
  }

  function handleOpenChange(e: MentionOpenChangeEvent) {
    setPosition(e.state.selection.main.head);
    setVisible(e.value);
  }

  useEffect(() => {
    if (!editor) {
      return;
    }
  }, [editor, visible]);

  return (
    <>
      <Mention triggerCharacters={['{', '{}', '@']} onOpenChange={handleOpenChange} />

      <Popover
        visible={visible}
        trigger="custom"
        position="topLeft"
        rePosKey={posKey}
        content={
          <div style={{ width: 300 }}>
            <InputsPicker
              inputsValues={inputsValues}
              onSelect={(v) => {
                insert(v);
              }}
            />
          </div>
        }
      >
        {/* PositionMirror allows the Popover to appear at the specified cursor position */}
        <PositionMirror
          position={position}
          // When Doc scroll, update position
          onChange={() => setPosKey(String(Math.random()))}
        />
      </Popover>
    </>
  );
}
