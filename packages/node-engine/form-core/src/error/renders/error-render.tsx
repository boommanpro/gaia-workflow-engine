import React, { useCallback, useEffect } from 'react';

import { FlowNodeEntity } from '@flowgram.ai/document';
import { PlaygroundContext, useRefresh, useService, PluginContext } from '@flowgram.ai/core';

import { FlowNodeErrorData } from '../flow-node-error-data';
import { MATERIAL_KEY, NodeManager, NodePluginRender } from '../../node';
import { defaultErrorRender } from './default-error-render';

interface NodeRenderProps {
  node: FlowNodeEntity;
  playgroundContext: PlaygroundContext;
  clientContext: PluginContext;
}

export const ErrorRender = ({ node, playgroundContext, clientContext }: NodeRenderProps) => {
  const refresh = useRefresh();
  const nodeErrorData = node.getData<FlowNodeErrorData>(FlowNodeErrorData);
  const nodeError = nodeErrorData.getError();
  const nodeManager = useService<NodeManager>(NodeManager);
  const nodeErrorRender = nodeManager.getMaterialRender(MATERIAL_KEY.NODE_ERROR_RENDER);

  const renderError = useCallback(() => {
    if (!nodeErrorRender) {
      return defaultErrorRender({
        error: nodeError,
        context: { node, playgroundContext, clientContext },
      });
    }
    return nodeErrorRender({
      error: nodeError,
      context: { node, playgroundContext, clientContext },
    });
  }, [nodeError, node, playgroundContext, clientContext]);

  useEffect(() => {
    const disposable = nodeErrorData.onDataChange(() => {
      refresh();
    });
    return () => {
      disposable.dispose();
    };
  }, []);

  return nodeError ? renderError() : null;
};

export const errorPluginRender: NodePluginRender = (props) => <ErrorRender {...props} />;
