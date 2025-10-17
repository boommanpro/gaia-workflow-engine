/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useState } from 'react';

import { DisposableCollection } from '@flowgram.ai/utils';
import { HistoryService } from '@flowgram.ai/history';
import {
  FlowDocument,
  FlowLayoutDefault,
  FlowNodeRenderData,
  PlaygroundInteractiveType,
  EditorState,
} from '@flowgram.ai/editor';
import { usePlayground, usePlaygroundContainer, useService } from '@flowgram.ai/editor';

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

export interface PlaygroundTools {
  /**
   * 缩放 zoom 大小比例
   */
  zoom: number;
  /**
   * 放大
   */
  zoomin: (easing?: boolean) => void;
  /**
   * 缩小
   */
  zoomout: (easing?: boolean) => void;
  /**
   * 设置缩放比例
   * @param zoom
   */
  updateZoom: (newZoom: number, easing?: boolean, easingDuration?: number) => void;
  /**
   * 自适应视区
   */
  fitView: (easing?: boolean, easingDuration?: number, padding?: number) => Promise<void>;
  /**
   * 是否垂直布局
   */
  isVertical: boolean;
  /**
   * 切换布局, 如果不传入则直接切换
   */
  changeLayout: (layout?: FlowLayoutDefault) => void;

  /** 交互模式：鼠标 or 触控板 */
  interactiveType: PlaygroundInteractiveType;
  setInteractiveType: (type: PlaygroundInteractiveType) => void;
  /**
   * 是否可 redo
   */
  canRedo: boolean;
  /**
   * 是否可 undo
   */
  canUndo: boolean;
  /**
   * redo
   */
  redo: () => void;
  /**
   * undo
   */
  undo: () => void;
}

export function usePlaygroundTools(props?: PlaygroundToolsPropsType): PlaygroundTools {
  const { maxZoom, minZoom } = props || {};
  const playground = usePlayground();
  const container = usePlaygroundContainer();
  const historyService = container.isBound(HistoryService)
    ? container.get(HistoryService)
    : undefined;
  const doc = useService<FlowDocument>(FlowDocument);
  const [interactiveType, setInteractiveType] = useState<PlaygroundInteractiveType>('PAD');

  const [zoom, setZoom] = useState(1);
  const [currentLayout, updateLayout] = useState(doc.layout);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // 获取合适视角
  const handleFitView = useCallback(
    (easing?: boolean, easingDuration?: number, padding?: number) => {
      padding = padding || 30;
      return playground.config.fitView(doc.root.bounds, easing, padding, easingDuration);
    },
    [doc, playground]
  );
  const changeLayout = useCallback(
    (newLayout?: FlowLayoutDefault) => {
      const allNodes = doc.getAllNodes();
      newLayout =
        newLayout ||
        (doc.layout.name === FlowLayoutDefault.HORIZONTAL_FIXED_LAYOUT
          ? FlowLayoutDefault.VERTICAL_FIXED_LAYOUT
          : FlowLayoutDefault.HORIZONTAL_FIXED_LAYOUT);
      allNodes.map((node) => {
        const renderData = node.getData(FlowNodeRenderData);
        renderData.node.classList.add('gedit-transition-ease');
      });
      setTimeout(() => {
        handleFitView();
      }, 10);
      setTimeout(() => {
        allNodes.map((node) => {
          const renderData = node.getData(FlowNodeRenderData);
          renderData.node.classList.remove('gedit-transition-ease');
        });
      }, 500);
      doc.setLayout(newLayout);
      updateLayout(doc.layout);
    },
    [doc, playground]
  );

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

  const handleUpdateZoom = useCallback(
    (value: number, easing?: boolean, easingDuration?: number) => {
      playground.config.updateZoom(value, easing, easingDuration);
    },
    [playground]
  );

  const handleUndo = useCallback(() => historyService?.undo(), [historyService]);
  const handleRedo = useCallback(() => historyService?.redo(), [historyService]);

  function handleUpdateInteractiveType(interactiveType: PlaygroundInteractiveType) {
    if (interactiveType === 'MOUSE') {
      playground.editorState.changeState(EditorState.STATE_MOUSE_FRIENDLY_SELECT.id);
    } else if (interactiveType === 'PAD') {
      playground.editorState.changeState(EditorState.STATE_SELECT.id);
    }
    setInteractiveType(interactiveType);
  }

  useEffect(() => {
    const dispose = new DisposableCollection();
    if (playground) {
      dispose.push(playground.onZoom((z) => setZoom(z)));
    }
    if (historyService) {
      dispose.push(
        historyService.undoRedoService.onChange(() => {
          setCanUndo(historyService.canUndo());
          setCanRedo(historyService.canRedo());
        })
      );
    }
    return () => dispose.dispose();
  }, [playground, historyService]);

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
    updateZoom: handleUpdateZoom,
    zoom,
    isVertical: currentLayout.name === FlowLayoutDefault.VERTICAL_FIXED_LAYOUT,
    changeLayout,
    canRedo,
    canUndo,
    undo: handleUndo,
    redo: handleRedo,
    interactiveType,
    setInteractiveType: handleUpdateInteractiveType,
  };
}
