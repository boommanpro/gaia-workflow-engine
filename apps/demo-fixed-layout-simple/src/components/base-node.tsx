/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeEntity, useNodeRender, useClientContext } from '@flowgram.ai/fixed-layout-editor';
import { IconDeleteStroked } from '@douyinfe/semi-icons';

export const BaseNode = ({ node }: { node: FlowNodeEntity }) => {
  const ctx = useClientContext();
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
    <div
      className="demo-fixed-node"
      /*
       * onMouseEnter is added to a fixed layout node primarily to listen for hover highlighting of branch lines
       * onMouseEnter 加到固定布局节点主要是为了监听 分支线条的 hover 高亮
       **/
      onMouseEnter={nodeRender.onMouseEnter}
      onMouseLeave={nodeRender.onMouseLeave}
      onMouseDown={(e) => {
        // trigger drag node
        nodeRender.startDrag(e);
        e.stopPropagation();
      }}
      style={{
        /**
         * Lets you precisely control the style of branch nodes
         * 用于精确控制分支节点的样式
         * isBlockIcon: 整个 condition 分支的 头部节点
         * isBlockOrderIcon: 分支的第一个节点
         */
        opacity: nodeRender.dragging ? 0.3 : 1,
        ...(nodeRender.isBlockOrderIcon || nodeRender.isBlockIcon ? { width: 260 } : {}),
      }}
    >
      {!nodeRender.readonly && (
        <IconDeleteStroked
          style={{ position: 'absolute', right: 4, top: 4 }}
          onClick={() => ctx.operation.deleteNode(nodeRender.node)}
        />
      )}
      {form?.render()}
    </div>
  );
};
