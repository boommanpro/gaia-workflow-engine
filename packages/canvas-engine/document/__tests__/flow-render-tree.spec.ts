/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it } from 'vitest';

// import { FlowDocumentConfigEnum } from '../src/typings';
// import { FlowDocumentConfigDefaultData } from '../src/flow-document-config';
import { FlowDocument } from '../src/flow-document';
import { baseMockNodeEnd2 } from './flow.mock';
import { createDocumentContainer } from './flow-document-container.mock';

describe('flow-render-tree', () => {
  let container = createDocumentContainer();
  let document: FlowDocument;

  beforeEach(() => {
    container = createDocumentContainer();
    document = container.get<FlowDocument>(FlowDocument);
  });

  /**
   * 节点折叠
   */
  it('node collapsed', () => {
    container.get(FlowDocument).fromJSON(baseMockNodeEnd2);
    document = container.get<FlowDocument>(FlowDocument);

    const { renderTree } = document;

    const inlineBlocks1 = document.getNode('$inlineBlocks$dynamicSplitcxIBv')!;
    const inlineBlocks2 = document.getNode('$inlineBlocks$split')!;
    inlineBlocks1.collapsed = true;
    renderTree.updateRenderStruct();

    expect(inlineBlocks1.children.length).toEqual(0);
    expect(inlineBlocks1.allCollapsedChildren.length).toEqual(5);
    expect(document.renderTree.toString()).toEqual(`root
|-- start_0
|-- split
|---- $blockIcon$split
|---- $inlineBlocks$split
|------ branch_0
|-------- $blockOrderIcon$branch_0
|-------- endbL5T2
|------ branch_1
|-------- $blockOrderIcon$branch_1
|-------- dynamicSplitcxIBv
|---------- $blockIcon$dynamicSplitcxIBv
|---------- $inlineBlocks$dynamicSplitcxIBv
|-------- endT3VLX
|------ _sJEq
|-------- $blockOrderIcon$_sJEq
|-- staticSplitHLvrh
|---- $blockIcon$staticSplitHLvrh
|---- $inlineBlocks$staticSplitHLvrh
|------ fPE-N
|-------- $blockOrderIcon$fPE-N
|------ ulpHV
|-------- $blockOrderIcon$ulpHV
|-- end_0`);
    inlineBlocks2.collapsed = true;
    renderTree.updateRenderStruct();

    expect(inlineBlocks2.children.length).toEqual(0);
    expect(inlineBlocks2.allCollapsedChildren.length).toEqual(16);
    expect(document.renderTree.toString()).toEqual(`root
|-- start_0
|-- split
|---- $blockIcon$split
|---- $inlineBlocks$split
|-- staticSplitHLvrh
|---- $blockIcon$staticSplitHLvrh
|---- $inlineBlocks$staticSplitHLvrh
|------ fPE-N
|-------- $blockOrderIcon$fPE-N
|------ ulpHV
|-------- $blockOrderIcon$ulpHV
|-- end_0`);
  });

  it('render tree stop modified tree', () => {
    const { renderTree } = document;
    expect(() => renderTree.remove()).toThrowError(/cannot use/);
    expect(() => renderTree.addChild()).toThrowError(/cannot use/);
    expect(() => renderTree.insertAfter()).toThrowError(/cannot use/);
    expect(() => renderTree.removeParent()).toThrowError(/cannot use/);
  });

  // /**
  //  * 处理结束节点偏移
  //  * 结束节点产品改方案
  //  */
  // it.skip('refine end branch', () => {
  //   container.bind(FlowDocumentConfigDefaultData).toConstantValue({
  //     [FlowDocumentConfigEnum.END_NODES_REFINE_BRANCH]: true,
  //   });
  //   container.get(FlowDocument).fromJSON(dataList.end);
  //   document = container.get<FlowDocument>(FlowDocument);
  //
  //   const inlineBlocks1 = document.getNode('$inlineBlocks$dynamicSplitcxIBv')!;
  //   const inlineBlocks2 = document.getNode('$inlineBlocks$split')!;
  //   inlineBlocks1.collapsed = false;
  //   inlineBlocks2.collapsed = false;
  //
  //   const { renderTree } = document;
  //   renderTree.updateRenderStruct();
  //
  //   expect(document.renderTree.toString()).toMatchSnapshot();
  //
  //   inlineBlocks2.collapsed = true;
  //   renderTree.updateRenderStruct();
  //
  //   // 结束节点拽进去的节点都需要收起
  //   expect(document.renderTree.toString()).toMatchSnapshot();
  // });
});
