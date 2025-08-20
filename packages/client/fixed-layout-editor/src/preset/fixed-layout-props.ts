/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { SelectBoxPluginOptions } from '@flowgram.ai/select-box-plugin';
import { FixedHistoryPluginOptions, HistoryService } from '@flowgram.ai/fixed-history-plugin';
import { type FixDragPluginOptions } from '@flowgram.ai/fixed-drag-plugin';
import {
  ClipboardService,
  EditorPluginContext,
  EditorProps,
  FlowDocument,
  FlowDocumentJSON,
  FlowLayoutDefault,
  SelectionService,
  PluginContext,
  FlowNodeEntity,
  FlowTransitionLine,
  FlowTransitionLabel,
} from '@flowgram.ai/editor';

import { FlowOperationService } from '../types';

export const FixedLayoutPluginContext = PluginContext;

export interface FixedLayoutPluginTools {
  fitView: (easing?: boolean) => Promise<void>;
}
export interface FixedLayoutPluginContext extends EditorPluginContext {
  document: FlowDocument;
  /**
   * 提供对画布节点相关操作方法, 并 支持 redo/undo
   */
  operation: FlowOperationService;
  clipboard: ClipboardService;
  selection: SelectionService;
  history: HistoryService;
  tools: FixedLayoutPluginTools;
}

/**
 * 固定布局配置
 */
export interface FixedLayoutProps extends EditorProps<FixedLayoutPluginContext, FlowDocumentJSON> {
  /**
   * SelectBox config
   */
  selectBox?: SelectBoxPluginOptions;
  /**
   * Drag/Drop config
   */
  dragdrop?: FixDragPluginOptions<FixedLayoutPluginContext>;
  /**
   * Redo/Undo enable
   */
  history?: FixedHistoryPluginOptions<FixedLayoutPluginContext> & { disableShortcuts?: boolean };
  /**
   * vertical or horizontal layout
   */
  defaultLayout?: FlowLayoutDefault | string; // 默认布局
  /**
   * Customize the node line
   * 自定义节点线条
   */
  formatNodeLines?: (node: FlowNodeEntity, lines: FlowTransitionLine[]) => FlowTransitionLine[];
  /**
   * Custom node label
   * 自定义节点 label
   */
  formatNodeLabels?: (node: FlowNodeEntity, lines: FlowTransitionLabel[]) => FlowTransitionLabel[];
}

export namespace FixedLayoutProps {
  /**
   * 默认配置
   */
  export const DEFAULT: FixedLayoutProps = {
    ...EditorProps.DEFAULT,
    scroll: {
      enableScrollLimit: true,
    },
  } as FixedLayoutProps;
}
