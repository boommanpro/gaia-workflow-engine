import React, { memo, useCallback, useEffect } from 'react';

import { PlaygroundContext, useRefresh, useService, PluginContext } from '@flowgram.ai/core';

import { NodeEngineReactContext } from '../node-react/context/node-engine-react-context';
import { useNodeEngineContext } from '../node-react';
import { NodeManager } from '../node/node-manager';
import { PLUGIN_KEY } from '../node/core-plugins';
import { MATERIAL_KEY, type NodeRenderProps } from '../node';
import { getFormModel, isNodeFormReady } from '../form';
import { FlowNodeErrorData } from '../error/flow-node-error-data';
import { getNodeError } from '../error';

const PureNodeRender = ({ node }: NodeRenderProps) => {
  const refresh = useRefresh();
  const nodeErrorData = node.getData<FlowNodeErrorData>(FlowNodeErrorData);
  const formModel = getFormModel(node);
  const isNodeError = !!getNodeError(node);
  const isFormReady = isNodeFormReady(node);
  const playgroundContext = useService<PlaygroundContext>(PlaygroundContext);
  const clientContext = useService<PluginContext>(PluginContext);
  const nodeManager = useService<NodeManager>(NodeManager);
  const nodeFormRender = nodeManager.getPluginRender(PLUGIN_KEY.FORM);
  const nodeErrorRender = nodeManager.getPluginRender(PLUGIN_KEY.ERROR);
  const nodePlaceholderRender = nodeManager.getMaterialRender(MATERIAL_KEY.NODE_PLACEHOLDER_RENDER);

  const nodeEngineContext = useNodeEngineContext();

  useEffect(() => {
    const errorDisposable = nodeErrorData.onDataChange(() => {
      refresh();
    });
    const formDisposable = formModel.onInitialized(() => {
      refresh();
    });
    return () => {
      errorDisposable.dispose();
      formDisposable.dispose();
    };
  }, []);

  const renderContent = useCallback(() => {
    if (isNodeError) {
      return nodeErrorRender!({ node, playgroundContext, clientContext });
    }
    if (!formModel.formMeta) {
      return null;
    }
    if (isFormReady) {
      return nodeFormRender!({ node, playgroundContext, clientContext });
    }
    return nodePlaceholderRender?.({ node, playgroundContext }) || null;
  }, [
    isNodeError,
    isFormReady,
    nodeErrorRender,
    nodeFormRender,
    nodePlaceholderRender,
    node,
    playgroundContext,
  ]);

  return (
    <NodeEngineReactContext.Provider value={nodeEngineContext.json}>
      {nodeManager.nodeRenderHoc(renderContent)()}
    </NodeEngineReactContext.Provider>
  );
};

export const NodeRender = memo(PureNodeRender);
