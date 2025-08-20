import { FlowNodeEntity, useNodeRender } from '@flowgram.ai/free-layout-editor';

import { NodeRenderContext } from '@editor/context';
import { ErrorIcon } from './styles';
import { NodeWrapper } from './node-wrapper';

export const BaseNode = ({ node }: { node: FlowNodeEntity }) => {
  /**
   * Provides methods related to node rendering
   * 提供节点渲染相关的方法
   */
  const nodeRender = useNodeRender();
  /**
   * It can only be used when nodeEngine is enabled
   * 只有在节点引擎开启时候才能使用表单
   */
  const form = nodeRender.form;

  return (
    <NodeRenderContext.Provider value={nodeRender}>
      <NodeWrapper>
        {form?.state.invalid && <ErrorIcon />}
        {form?.render()}
      </NodeWrapper>
    </NodeRenderContext.Provider>
  );
};
