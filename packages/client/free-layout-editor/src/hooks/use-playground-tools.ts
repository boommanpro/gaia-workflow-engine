/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable no-cond-assign */
import { useCallback, useEffect, useState } from 'react';

import { type Disposable } from '@flowgram.ai/utils';
import {
  EditorCursorState,
  InteractiveType,
  LineRenderType,
  WorkflowDocument,
  fitView,
  usePlayground,
  useService,
} from '@flowgram.ai/free-layout-core';
import { EditorState } from '@flowgram.ai/editor';

import { useAutoLayout } from './use-auto-layout';
import { FreeLayoutPluginTools } from '../preset';

interface SetCursorStateCallbackEvent {
  isPressingSpaceBar: boolean;
  cursorState: EditorCursorState;
}
type SetCursorStateCallback = (e: SetCursorStateCallbackEvent) => EditorCursorState | undefined;

export interface PlaygroundTools {
  zoomin: (easing?: boolean) => void;
  zoomout: (easing?: boolean) => void;
  fitView: (easing?: boolean) => void;
  autoLayout: FreeLayoutPluginTools['autoLayout'];
  /**
   * 切换线条
   */
  switchLineType: (lineType?: LineRenderType) => LineRenderType;
  lineType: LineRenderType;
  zoom: number;
  cursorState: EditorCursorState;
  setCursorState: (stateId: EditorCursorState | SetCursorStateCallback) => void;

  /** 交互模式：鼠标 or 触控板 */
  interactiveType: InteractiveType;
  setInteractiveType: (type: InteractiveType) => void;

  /** 设置鼠标缩放 delta */
  setMouseScrollDelta: (mouseScrollDelta: number | ((zoom: number) => number)) => void;
}

export interface PlaygroundToolsPropsType {
  /**
   * 最大缩放比，默认 2
   */
  maxZoom?: number;
  /**
   * 最小缩放比，默认 0.25
   */
  minZoom?: number;
}

export function usePlaygroundTools(props?: PlaygroundToolsPropsType): PlaygroundTools {
  const { maxZoom, minZoom } = props || {};
  const playground = usePlayground();
  const doc = useService<WorkflowDocument>(WorkflowDocument);

  const [zoom, setZoom] = useState(1);
  const [lineType, setLineType] = useState(doc.linesManager.lineType);
  const [cursorState, setCursorState] = useState<EditorCursorState>(EditorCursorState.SELECT);
  const [interactiveType, setInteractiveType] = useState<InteractiveType>(InteractiveType.PAD);

  const handleZoomOut = useCallback(
    (easing?: boolean) => {
      playground?.config.zoomout(easing);
    },
    [zoom, playground]
  );

  const handleZoomIn = useCallback(
    (easing?: boolean) => {
      playground?.config.zoomin(easing);
    },
    [zoom, playground]
  );

  // 切换线条类型
  const handleLineTypeChange = useCallback(
    (lineType?: LineRenderType) => {
      const newLineType = doc.linesManager.switchLineType(lineType);
      setLineType(newLineType);
      return newLineType;
    },
    [doc]
  );

  // 获取合适视角
  const handleFitView = useCallback(
    (easing?: boolean) => {
      fitView(doc, playground.config, easing);
    },
    [doc, playground]
  );

  const handleAutoLayout = useAutoLayout();

  useEffect(() => {
    let dispose: Disposable | null = null;
    if (playground) {
      dispose = playground.onZoom((z) => setZoom(z));
    }
    return () => {
      if (dispose) {
        dispose.dispose();
      }
    };
  }, [playground]);

  useEffect(() => {
    const disposable = playground.editorState.onStateChange((e) => {
      setCursorState(
        e.state === EditorState.STATE_GRAB || e.state === EditorState.STATE_MOUSE_FRIENDLY_SELECT
          ? EditorCursorState.GRAB
          : EditorCursorState.SELECT
      );

      // 设置交互模式
      setInteractiveType(
        e.state === EditorState.STATE_MOUSE_FRIENDLY_SELECT
          ? InteractiveType.MOUSE
          : InteractiveType.PAD
      );
    });

    return () => {
      disposable.dispose();
    };
  }, [playground]);

  function handleUpdateCursorState(stateId: EditorCursorState | SetCursorStateCallback) {
    let finalStateId: EditorCursorState | undefined;

    if (typeof stateId === 'function') {
      finalStateId = stateId({
        isPressingSpaceBar: playground.editorState.isPressingSpaceBar,
        cursorState,
      });
    } else {
      finalStateId = stateId;
    }

    if (typeof finalStateId === 'undefined') {
      return;
    }

    if (finalStateId === EditorCursorState.GRAB) {
      playground.editorState.changeState(EditorState.STATE_GRAB.id);
      setCursorState(finalStateId);
    } else if ((finalStateId = EditorCursorState.SELECT)) {
      playground.editorState.changeState(EditorState.STATE_SELECT.id);
      setCursorState(finalStateId);
    }
  }

  function handleUpdateInteractiveType(interactiveType: InteractiveType) {
    if (interactiveType === InteractiveType.MOUSE) {
      // 鼠标优先交互模式：更新状态 & 设置小手
      playground.editorState.changeState(EditorState.STATE_MOUSE_FRIENDLY_SELECT.id);
      setCursorState(EditorCursorState.GRAB);
    } else if (interactiveType === InteractiveType.PAD) {
      // 触控板优先交互模式：更新状态 & 设置箭头
      playground.editorState.changeState(EditorState.STATE_SELECT.id);
      setCursorState(EditorCursorState.SELECT);
    }
    setInteractiveType(interactiveType);
    return;
  }

  function handleUpdateMouseScrollDelta(delta: number | ((zoom: number) => number)) {
    playground.config.updateConfig({
      mouseScrollDelta: delta,
    });
  }

  useEffect(() => {
    const config = playground.config.config;
    playground.config.updateConfig({
      maxZoom: maxZoom !== undefined ? maxZoom : config.maxZoom,
      minZoom: minZoom !== undefined ? minZoom : config.minZoom,
    });
  }, [playground, maxZoom, minZoom]);

  return {
    zoomin: handleZoomIn,
    zoomout: handleZoomOut,
    fitView: handleFitView,
    autoLayout: handleAutoLayout,
    switchLineType: handleLineTypeChange,
    zoom,
    lineType,
    cursorState,
    setCursorState: handleUpdateCursorState,
    interactiveType,
    setInteractiveType: handleUpdateInteractiveType,
    setMouseScrollDelta: handleUpdateMouseScrollDelta,
  };
}
