/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { FlowVirtualTree } from '../src/flow-virtual-tree';

import NodeInfo = FlowVirtualTree.NodeInfo;

interface Node {
  id: string;
}

describe('flow-virtual-tree', () => {
  let tree: FlowVirtualTree<Node>;
  beforeEach(() => {
    tree = new FlowVirtualTree<Node>({
      id: 'root',
    });
    addBase();
  });
  function addBase(): void {
    const noop1 = tree.addChild(tree.root, { id: 'noop1' });
    const noop2 = tree.addChild(noop1, { id: 'noop2' });
    tree.addChild(tree.root, { id: 'noop1_n' });
    tree.addChild(noop2, { id: 'noop3' });
    tree.addChild(noop2, { id: 'noop4' });
    tree.addChild(noop2, { id: 'noop5' });
  }
  function get(id: string): Node {
    return tree.getById(id)!;
  }

  function getInfo(id: string): FlowVirtualTree.NodeInfo<Node> {
    return tree.getInfo(get(id)!)!;
  }

  it('get infos', () => {
    const infos: Record<string, NodeInfo<Node>> = {};
    // tree.traverse()
    expect(tree.toString()).toEqual(`root
|-- noop1
|---- noop2
|------ noop3
|------ noop4
|------ noop5
|-- noop1_n`);
    expect(tree.size).toEqual(7);
    tree.traverse((n) => {
      infos[n.id] = {
        parent: tree.getParent(n),
        pre: tree.getPre(n),
        next: tree.getNext(n),
        children: tree.getChildren(n),
      };
    });
    expect(infos).toEqual({
      root: { children: [{ id: 'noop1' }, { id: 'noop1_n' }] },
      noop1: { parent: { id: 'root' }, next: { id: 'noop1_n' }, children: [{ id: 'noop2' }] },
      noop2: {
        parent: { id: 'noop1' },
        children: [{ id: 'noop3' }, { id: 'noop4' }, { id: 'noop5' }],
      },
      noop3: { parent: { id: 'noop2' }, next: { id: 'noop4' }, children: [] },
      noop4: { parent: { id: 'noop2' }, pre: { id: 'noop3' }, next: { id: 'noop5' }, children: [] },
      noop5: { parent: { id: 'noop2' }, pre: { id: 'noop4' }, children: [] },
      noop1_n: { parent: { id: 'root' }, pre: { id: 'noop1' }, children: [] },
    });
  });

  it('add child from node existed', () => {
    tree.addChild(get('root'), get('noop4'));
    expect(tree.toString()).toEqual(`root
|-- noop1
|---- noop2
|------ noop3
|------ noop5
|-- noop1_n
|-- noop4`);
    expect(getInfo('noop4').pre).toEqual(get('noop1_n'));
    expect(getInfo('noop4').parent).toEqual(get('root'));
    expect(getInfo('noop3').next).toEqual(get('noop5'));
    expect(getInfo('noop5').pre).toEqual(get('noop3'));
  });

  it('add child same', () => {
    tree.addChild(get('root'), get('noop1'));
    expect(tree.toString()).toEqual(`root
|-- noop1
|---- noop2
|------ noop3
|------ noop4
|------ noop5
|-- noop1_n`);
  });

  it('remove child', () => {
    tree.remove(get('noop4')!);
    expect(tree.toString()).toEqual(`root
|-- noop1
|---- noop2
|------ noop3
|------ noop5
|-- noop1_n`);
    expect(tree.size).toEqual(6);
    expect(getInfo('noop3').next).toEqual(get('noop5'));
    expect(getInfo('noop5').pre).toEqual(get('noop3'));
    tree.remove(get('noop3')!);
    expect(getInfo('noop5').pre).toBeUndefined();
    expect(tree.toString()).toEqual(`root
|-- noop1
|---- noop2
|------ noop5
|-- noop1_n`);
    expect(tree.size).toEqual(5);
    tree.addChild(get('noop5'), { id: 'left' });
    tree.remove(get('noop2')!);
    expect(tree.toString()).toEqual(`root
|-- noop1
|-- noop1_n`);
    expect(tree.size).toEqual(3);
  });

  it('clear', () => {
    tree.clear();
    expect(tree.size).toEqual(0);
  });

  it('clone', () => {
    const clone = tree.clone();
    expect(clone.toString()).toEqual(tree.toString());
    expect(clone.size).toEqual(tree.size);
  });

  it('dispose', () => {
    let times = 0;
    tree.onTreeChange(() => {
      times += 1;
    });
    tree.addChild(tree.root, { id: 'noop1' });
    tree.dispose();
    tree.addChild(tree.root, { id: 'noop2' });
    expect(tree.toString()).toEqual(`root
|-- noop2`);
    expect(times).toEqual(1);
  });

  it('insertAfter', () => {
    tree.insertAfter(get('noop2'), { id: 'noop2_next' });
    expect(getInfo('noop2').next).toEqual(get('noop2_next'));
    expect(getInfo('noop2_next').pre).toEqual(get('noop2'));
    expect(getInfo('noop2_next').parent).toEqual(get('noop1'));
    expect(tree.toString()).toEqual(`root
|-- noop1
|---- noop2
|------ noop3
|------ noop4
|------ noop5
|---- noop2_next
|-- noop1_n`);
    tree.insertAfter(get('noop3'), { id: 'noop3_next' });
    expect(tree.toString()).toEqual(`root
|-- noop1
|---- noop2
|------ noop3
|------ noop3_next
|------ noop4
|------ noop5
|---- noop2_next
|-- noop1_n`);
    expect(getInfo('noop3').next).toEqual(get('noop3_next'));
    expect(getInfo('noop3_next').pre).toEqual(get('noop3'));
    expect(getInfo('noop3_next').next).toEqual(get('noop4'));
    expect(getInfo('noop3_next').parent).toEqual(get('noop2'));
    expect(getInfo('noop4').pre).toEqual(get('noop3_next'));
  });
});
