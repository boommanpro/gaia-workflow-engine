/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from 'react';

import { FlowGroupController, FlowNodeEntity, FlowNodeRenderData } from '@flowgram.ai/document';
import { FlowDocument } from '@flowgram.ai/document';
import { useEntityFromContext, useService } from '@flowgram.ai/core';
import { delay, Rectangle } from '@flowgram.ai/utils';

import { IGroupRender } from '../type';

function useCurrentDomNode(): HTMLDivElement {
  const entity = useEntityFromContext<FlowNodeEntity>();
  const renderData = entity.getData<FlowNodeRenderData>(FlowNodeRenderData);
  return renderData.node;
}

export const GroupRender: IGroupRender = props => {
  const { groupNode, GroupNode, GroupBoxHeader } = props;
  const container = useCurrentDomNode();
  const document = useService<FlowDocument>(FlowDocument);
  const groupController = FlowGroupController.create(groupNode);

  const [key, setKey] = useState(0);
  const [rendering, setRendering] = useState(true);
  const [collapsedCache, setCollapsedCache] = useState(groupController?.collapsed ?? false);

  const rerender = useCallback(async () => {
    setRendering(true);
    setKey(key + 1);
    // 边框bounds计算会有延迟
    await delay(50);
    setKey(key + 1);
    setRendering(false);
  }, [key]);

  // 监听 collapsed 变化触发重渲染
  useEffect(() => {
    const disposer = document.renderTree.onTreeChange(() => {
      if (groupController?.collapsed !== collapsedCache) {
        setCollapsedCache(groupController?.collapsed ?? false);
        rerender();
      }
    });
    return () => {
      disposer.dispose();
    };
  }, [key]);

  // 首次渲染时如果分组是展开状态，此时边框bounds计算会有延迟，需要强制重新渲染
  useEffect(() => {
    if (!groupController || groupController.collapsed) {
      return;
    }
    rerender();
  }, []);

  if (!groupController) {
    return <></>;
  }

  const groupNodeRender = (
    <GroupNode key={key} groupNode={groupNode} groupController={groupController} />
  );
  const groupBoxHeader = (
    <GroupBoxHeader key={key} groupController={groupController} groupNode={groupNode} />
  );

  if (groupController.collapsed) {
    const positionStyle: Partial<CSSStyleDeclaration> = {
      display: 'block',
      zIndex: '0',
      width: 'auto',
      height: 'auto',
    };
    Object.assign(container.style, positionStyle);
    return groupNodeRender;
  } else if (!rendering) {
    const bounds: Rectangle = groupController.bounds;
    const positionStyle: Partial<CSSStyleDeclaration> = {
      width: `${bounds.width}px`,
    };
    Object.assign(container.style, positionStyle);
    return groupBoxHeader;
  } else {
    return <></>;
  }
};
