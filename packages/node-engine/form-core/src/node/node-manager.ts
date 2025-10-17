/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { flow } from 'lodash-es';
import { injectable, multiInject, optional, postConstruct } from 'inversify';

import { NodeErrorRenderProps } from '../error';
import { NodePluginRender, NodeRenderHoc, Render } from './types';
import { NodeContribution } from './node-contribution';

export enum MaterialRenderKey {
  CustomNodeError = 'Material_CustomNodeError',
}

@injectable()
export class NodeManager {
  readonly materialRenderRegistry: Map<string, Render> = new Map();

  readonly pluginRenderRegistry: Map<string, Render> = new Map();

  readonly nodeRenderHocs: NodeRenderHoc[] = [];

  @multiInject(NodeContribution) @optional() protected nodeContributions: NodeContribution[] = [];

  registerMaterialRender(key: string, render: Render) {
    this.materialRenderRegistry.set(key, render);
  }

  getMaterialRender(key: string): Render | undefined {
    return this.materialRenderRegistry.get(key);
  }

  registerPluginRender(key: string, render: NodePluginRender): void {
    this.pluginRenderRegistry.set(key, render);
  }

  getPluginRender(key: string): NodePluginRender | undefined {
    return this.pluginRenderRegistry.get(key);
  }

  registerNodeErrorRender(render: Render<NodeErrorRenderProps>) {
    this.registerMaterialRender(MaterialRenderKey.CustomNodeError, render);
  }

  get nodeRenderHoc() {
    return flow(this.nodeRenderHocs);
  }

  registerNodeRenderHoc(hoc: NodeRenderHoc) {
    this.nodeRenderHocs.push(hoc);
  }

  get nodeErrorRender() {
    return this.materialRenderRegistry.get(MaterialRenderKey.CustomNodeError);
  }

  @postConstruct()
  protected init(): void {
    this.nodeContributions.forEach((contrib) => contrib.onRegister?.(this));
  }
}
