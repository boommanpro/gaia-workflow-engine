/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState, useCallback } from 'react';

import { usePlaygroundTools, useClientContext, useRefresh } from '@flowgram.ai/fixed-layout-editor';
import { IconButton, Space } from '@douyinfe/semi-ui';
import { IconUnlock, IconLock } from '@douyinfe/semi-icons';

export function Tools() {
  const { history, playground } = useClientContext();
  const tools = usePlaygroundTools();
  const refresh = useRefresh();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const toggleReadonly = useCallback(() => {
    playground.config.readonly = !playground.config.readonly;
  }, [playground]);

  useEffect(() => {
    const disposable = history.undoRedoService.onChange(() => {
      setCanUndo(history.canUndo());
      setCanRedo(history.canRedo());
    });
    return () => disposable.dispose();
  }, [history]);

  useEffect(() => {
    const disposable = playground.config.onReadonlyOrDisabledChange(() => refresh());
    return () => disposable.dispose();
  }, [playground]);

  return (
    <Space
      style={{ position: 'absolute', zIndex: 10, bottom: 16, left: 16, display: 'flex', gap: 8 }}
    >
      <button onClick={() => tools.zoomin()}>ZoomIn</button>
      <button onClick={() => tools.zoomout()}>ZoomOut</button>
      <button onClick={() => tools.fitView()}>Fitview</button>
      <button onClick={() => tools.changeLayout()}>ChangeLayout</button>
      <button onClick={() => history.undo()} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={() => history.redo()} disabled={!canRedo}>
        Redo
      </button>
      {playground.config.readonly ? (
        <IconButton
          theme="borderless"
          type="tertiary"
          icon={<IconLock />}
          onClick={toggleReadonly}
        />
      ) : (
        <IconButton
          theme="borderless"
          type="tertiary"
          icon={<IconUnlock />}
          onClick={toggleReadonly}
        />
      )}
      <span>{Math.floor(tools.zoom * 100)}%</span>
    </Space>
  );
}
