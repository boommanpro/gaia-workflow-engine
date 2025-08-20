/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { baseMock } from '../flow.mock';
import { createDocumentContainer } from '../flow-document-container.mock';
import { FlowDocument } from '../../src/flow-document';
import { FlowNodeRenderData } from '../../src/datas';

describe('flow-node-render-data', () => {
  let container = createDocumentContainer();
  let document: FlowDocument;
  const originSetTimeout = setTimeout;
  beforeEach(() => {
    vi.stubGlobal('setTimeout', (fn: any) => {
      fn();
      return 1;
    });
    container = createDocumentContainer();
    document = container.get<FlowDocument>(FlowDocument);
    document.fromJSON(baseMock, true);
    document.transformer.refresh();
  });
  afterEach(() => {
    vi.stubGlobal('setTimeout', originSetTimeout);
    document.dispose();
  });
  it('expanded and adable', () => {
    const renderData = document.getNode('end_0')!.getData(FlowNodeRenderData)!;
    expect(!!renderData.addable).toEqual(false);
    expect(renderData.expandable).toEqual(true);
    renderData.toggleExpand();
    expect(renderData.expanded).toEqual(true);
  });
  it('get dom node', () => {
    const renderData = document.getNode('end_0')!.getData<FlowNodeRenderData>(FlowNodeRenderData)!;
    expect(renderData.node).toEqual(renderData.node);
    const parentDomNode = window.document.createElement('div');
    parentDomNode.appendChild(renderData.node);
    expect(renderData.node.parentElement).toEqual(parentDomNode);
    expect(typeof renderData.node.addEventListener).toEqual('function');
    renderData.dispose();
    expect(renderData.node.parentElement).toEqual(null);
  });
  it('hover node visible', () => {
    const renderData = document.getNode('end_0')!.getData(FlowNodeRenderData)!;
    renderData.toggleMouseEnter();
    expect(renderData.hovered).toEqual(true);
    expect(renderData.activated).toEqual(true);
    expect(document.renderState.getNodeHovered()).toEqual(renderData.entity);
    renderData.toggleMouseLeave();
    expect(renderData.hovered).toEqual(false);
    expect(renderData.activated).toEqual(false);
    expect(document.renderState.getNodeHovered()).toEqual(undefined);
  });
  it('hover node hidden', () => {
    const renderData = document
      .getNode('$inlineBlocks$dynamicSplit_0')!
      .getData(FlowNodeRenderData)!;
    renderData.toggleMouseEnter();
    expect(renderData.hovered).toEqual(false); // 是隐藏节点
    expect(document.renderState.getNodeHovered()).toEqual(renderData.entity);
    renderData.toggleMouseLeave();
    expect(document.renderState.getNodeHovered()).toEqual(undefined);
  });
  it('hover node silent', () => {
    const renderData = document.getNode('end_0')!.getData(FlowNodeRenderData)!;
    renderData.toggleMouseEnter(true);
    expect(renderData.hovered).toEqual(false);
    expect(document.renderState.getNodeHovered()).toEqual(renderData.entity);
    renderData.toggleMouseLeave(true);
    expect(renderData.hovered).toEqual(false);
    expect(document.renderState.getNodeHovered()).toEqual(undefined);
  });
  it('activated', () => {
    const renderData = document.getNode('$blockIcon$dynamicSplit_0')!.getData(FlowNodeRenderData)!;
    renderData.activated = true;
    expect(renderData.activated).toEqual(true);
    expect(renderData.entity.parent!.getData(FlowNodeRenderData)!.activated).toEqual(true);
    expect(renderData.lineActivated).toEqual(true);
  });
});
