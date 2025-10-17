/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useEffect, useContext, useMemo, useRef, useState } from 'react';

import { useObserve } from '@flowgram.ai/reactive';
import { useStartDragNode } from '@flowgram.ai/fixed-drag-plugin';
import {
  usePlayground,
  FlowNodeBaseType,
  FlowNodeEntity,
  FlowNodeRenderData,
  useService,
  Disposable,
  PlaygroundEntityContext,
  NodeFormProps,
  getNodeForm,
} from '@flowgram.ai/editor';

import { FlowOperationService } from '../types';

export interface NodeRenderReturnType {
  id: string;
  type: string | number;
  /**
   * 节点 data 数据
   */
  data: any;
  /**
   * 更新节点 data 数据
   */
  updateData: (newData: any) => void;
  /**
   * BlockOrderIcon节点，一般用于分支的第一个占位节点
   */
  isBlockOrderIcon: boolean;
  /**
   * BlockIcon 节点，一般用于带有分支的占位节点
   */
  isBlockIcon: boolean;
  /**
   * 当前节点 (如果是 icon 则会返回它的父节点)
   */
  node: FlowNodeEntity;
  /**
   * 是否在拖拽中
   */
  dragging: boolean;
  /**
   * 节点是否激活
   */
  activated: boolean;
  /**
   * 节点是否展开
   */
  expanded: boolean;
  /**
   * 触发拖拽
   * @param e
   */
  startDrag: (e: React.MouseEvent) => void;
  /**
   * 鼠标进入, 主要用于控制 activated 状态
   */
  onMouseEnter: (e: React.MouseEvent) => void;
  /**
   * 鼠标离开, 主要用于控制 activated 状态
   */
  onMouseLeave: (e: React.MouseEvent) => void;

  /**
   * 渲染表单，只有节点引擎开启才能使用
   */
  form: NodeFormProps<any> | undefined;

  /**
   * 获取节点的扩展数据
   */
  getExtInfo<T = any>(): T;

  /**
   * 更新节点的扩展数据
   * @param extInfo
   */
  updateExtInfo<T = any>(extInfo: T, fullUpdate?: boolean): void;

  /**
   * 展开/收起节点
   * @param expanded
   */
  toggleExpand(): void;

  /**
   * 删除节点
   */
  deleteNode: () => void;
  /**
   * 全局 readonly 状态
   */
  readonly: boolean;
}

/**
 * Provides methods related to node rendering
 * @param nodeFromProps
 */
export function useNodeRender(nodeFromProps?: FlowNodeEntity): NodeRenderReturnType {
  const renderNode = nodeFromProps || useContext<FlowNodeEntity>(PlaygroundEntityContext);
  const nodeCache = useRef<FlowNodeEntity | undefined>();
  const renderData = renderNode.getData<FlowNodeRenderData>(FlowNodeRenderData)!;
  const { expanded, dragging, activated } = renderData;
  const { startDrag: startDragOrigin, dragOffset } = useStartDragNode();
  const playground = usePlayground();
  const isBlockOrderIcon = renderNode.flowNodeType === FlowNodeBaseType.BLOCK_ORDER_ICON;
  const isBlockIcon = renderNode.flowNodeType === FlowNodeBaseType.BLOCK_ICON;
  const [formValueVersion, updateFormValueVersion] = useState<number>(0);
  const formValueDependRef = useRef(false);
  formValueDependRef.current = false;
  // 在 BlockIcon 情况，如果在触发 fromJSON 时候更新表单数据导致刷新节点会存在 renderNode.parent 为 undefined，所以这里 nodeCache 进行缓存
  const node =
    (isBlockOrderIcon || isBlockIcon ? renderNode.parent! : renderNode) || nodeCache.current;
  nodeCache.current = node;
  const operationService = useService<FlowOperationService>(FlowOperationService);
  const deleteNode = useCallback(() => {
    operationService.deleteNode(node);
  }, [node, operationService]);

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      startDragOrigin(
        e,
        { dragStartEntity: renderNode },
        { dragOffsetX: dragOffset.x, dragOffsetY: dragOffset.y }
      );
    },
    [renderNode, startDragOrigin]
  );

  const onMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      renderData.toggleMouseEnter();
    },
    [renderData]
  );

  const onMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      renderData.toggleMouseLeave();
    },
    [renderData]
  );

  const toggleExpand = useCallback(() => {
    renderData.toggleExpand();
  }, [renderData]);

  const getExtInfo = useCallback(() => node.getExtInfo() as any, [node]);
  const updateExtInfo = useCallback(
    (data: any, fullUpdate?: boolean) => {
      node.updateExtInfo(data, fullUpdate);
    },
    [node]
  );
  const form = useMemo(() => getNodeForm(node), [node]);
  // Listen FormState change
  const formState = useObserve<any>(form?.state);

  useEffect(() => {
    let dispose: Disposable | undefined;
    if (isBlockIcon || isBlockOrderIcon) {
      // icon 的扩展数据是存在父节点上
      dispose = renderNode.parent!.onExtInfoChange(() => renderNode.renderData.fireChange());
    }
    return () => dispose?.dispose();
  }, [renderNode, isBlockIcon, isBlockOrderIcon]);

  useEffect(() => {
    const toDispose = form?.onFormValuesChange(() => {
      if (formValueDependRef.current) {
        updateFormValueVersion((v) => v + 1);
      }
    });
    return () => toDispose?.dispose();
  }, [form]);

  const readonly = playground.config.readonly;

  return useMemo(
    () => ({
      id: node.id,
      type: node.flowNodeType,
      get data() {
        if (form) {
          formValueDependRef.current = true;
          return form.values;
        }
        return getExtInfo();
      },
      updateData(values: any) {
        if (form) {
          form.updateFormValues(values);
        } else {
          updateExtInfo(values, true);
        }
      },
      node,
      isBlockOrderIcon,
      isBlockIcon,
      activated,
      readonly,
      expanded,
      dragging,
      startDrag,
      deleteNode,
      onMouseEnter,
      onMouseLeave,
      getExtInfo,
      updateExtInfo,
      toggleExpand,
      get form() {
        if (!form) return undefined;
        return {
          ...form,
          get values() {
            formValueDependRef.current = true;
            return form.values!;
          },
          get state() {
            return formState;
          },
        };
      },
    }),
    [
      node,
      isBlockOrderIcon,
      isBlockIcon,
      activated,
      readonly,
      expanded,
      dragging,
      startDrag,
      deleteNode,
      onMouseEnter,
      onMouseLeave,
      getExtInfo,
      updateExtInfo,
      toggleExpand,
      form,
      formState,
      formValueVersion,
    ]
  );
}
