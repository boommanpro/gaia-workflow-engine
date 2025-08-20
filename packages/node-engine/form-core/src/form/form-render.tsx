/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect } from 'react';

import { useRefresh } from '@flowgram.ai/utils';
import { FlowNodeEntity } from '@flowgram.ai/document';
import { PlaygroundContext } from '@flowgram.ai/core';

import { NodeContext } from '../node';
import { FormModel } from './models';
import { FlowNodeFormData } from './flow-node-form-data';

interface FormRenderProps {
  node: FlowNodeEntity;
  playgroundContext?: PlaygroundContext;
}

function getFormModelFromNode(node: FlowNodeEntity) {
  return node.getData(FlowNodeFormData)?.getFormModel<FormModel>();
}

export function FormRender({ node }: FormRenderProps): any {
  const refresh = useRefresh();

  const formModel = getFormModelFromNode(node);

  useEffect(() => {
    const disposable = formModel?.onInitialized(() => {
      refresh();
    });
    return () => {
      disposable.dispose();
    };
  }, [formModel]);

  return formModel?.initialized ? formModel.render() : null;
}

export const formPluginRender = (props: NodeContext) => <FormRender {...props} />;
