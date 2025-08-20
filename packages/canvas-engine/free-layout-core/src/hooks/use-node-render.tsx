import type React from 'react';
import { useCallback, useEffect, useRef, useState, useContext, useMemo } from 'react';

import { useObserve } from '@flowgram.ai/reactive';
import { getNodeForm } from '@flowgram.ai/node';
import { FlowNodeRenderData } from '@flowgram.ai/document';
import {
  MouseTouchEvent,
  PlaygroundEntityContext,
  useListenEvents,
  useService,
} from '@flowgram.ai/core';

import { WorkflowDragService, WorkflowSelectService } from '../service';
import { WorkflowNodePortsData } from '../entity-datas';
import { type WorkflowNodeEntity } from '../entities';
import { usePlaygroundReadonlyState } from './use-playground-readonly-state';
import { type NodeRenderReturnType } from './typings';

function checkTargetDraggable(el: any): boolean {
  return (
    el &&
    el.tagName !== 'INPUT' &&
    el.tagName !== 'TEXTAREA' &&
    !el.closest('.flow-canvas-not-draggable')
  );
}
export function useNodeRender(nodeFromProps?: WorkflowNodeEntity): NodeRenderReturnType {
  const node = nodeFromProps || useContext<WorkflowNodeEntity>(PlaygroundEntityContext);
  const renderData = node.getData(FlowNodeRenderData)!;
  const portsData = node.getData(WorkflowNodePortsData)!;
  const readonly = usePlaygroundReadonlyState();
  const dragService = useService<WorkflowDragService>(WorkflowDragService);
  const selectionService = useService<WorkflowSelectService>(WorkflowSelectService);
  const isDragging = useRef(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [linkingNodeId, setLinkingNodeId] = useState('');

  useEffect(() => {
    const disposable = dragService.onDragLineEventChange(({ type, onDragNodeId }) => {
      if (type === 'onDrag') {
        setLinkingNodeId(onDragNodeId || '');
      } else {
        setLinkingNodeId('');
      }
    });

    return () => {
      disposable.dispose();
    };
  }, []);

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      MouseTouchEvent.preventDefault(e);
      if (!selectionService.isSelected(node.id)) {
        selectNode(e);
      }
      if (!MouseTouchEvent.isTouchEvent(e as unknown as React.TouchEvent)) {
        // 输入框不能拖拽
        if (!checkTargetDraggable(e.target) || !checkTargetDraggable(document.activeElement)) {
          return;
        }
      }
      isDragging.current = true;
      // 拖拽选中的节点
      dragService.startDragSelectedNodes(e)?.finally(() =>
        setTimeout(() => {
          isDragging.current = false;
        })
      );
    },
    [dragService, node]
  );
  /**
   * 单选节点
   */
  const selectNode = useCallback(
    (e: React.MouseEvent) => {
      // 触发了拖拽就不要再触发单选
      if (isDragging.current) {
        return;
      }
      // 追加选择
      if (e.shiftKey) {
        selectionService.toggleSelect(node);
      } else {
        selectionService.selectNode(node);
      }
      if (e.target) {
        (e.target as HTMLDivElement).focus();
      }
    },
    [node]
  );
  const deleteNode = useCallback(() => node.dispose(), [node]);
  // 监听端口变化
  useListenEvents(portsData.onDataChange);

  /**
   * - 下面的 firefox 为了修复一个 bug：https://meego.feishu.cn/bot_bot/issue/detail/3001017843
   * - firefox 下 draggable 属性会影响节点 input 内容 focus：https://jsfiddle.net/Aydar/ztsvbyep/3/
   * - 该 bug 在 firefox 浏览器上存在了很久，需要作兼容：https://bugzilla.mozilla.org/show_bug.cgi?id=739071
   */
  const isFirefox = navigator?.userAgent?.includes?.('Firefox');
  const onFocus = useCallback(() => {
    if (isFirefox) {
      nodeRef.current?.setAttribute('draggable', 'false');
    }
  }, []);
  const onBlur = useCallback(() => {
    if (isFirefox) {
      nodeRef.current?.setAttribute('draggable', 'true');
    }
  }, []);
  const getExtInfo = useCallback(() => node.getExtInfo() as any, [node]);
  const updateExtInfo = useCallback(
    (data: any) => {
      node.updateExtInfo(data);
    },
    [node]
  );
  const form = useMemo(() => getNodeForm(node), [node]);
  // Listen FormState change
  const formState = useObserve<any>(form?.state);
  const toggleExpand = useCallback(() => {
    renderData.toggleExpand();
  }, [renderData]);

  return {
    node,
    selected: selectionService.isSelected(node.id),
    activated: selectionService.isActivated(node.id),
    expanded: renderData.expanded,
    startDrag,
    ports: portsData.allPorts,
    deleteNode,
    selectNode,
    readonly,
    linkingNodeId,
    nodeRef,
    onFocus,
    onBlur,
    getExtInfo,
    updateExtInfo,
    toggleExpand,
    get form() {
      if (!form) return undefined;
      return {
        ...form,
        get values() {
          return form.values!;
        },
        get state() {
          return formState;
        },
      };
    },
  };
}
