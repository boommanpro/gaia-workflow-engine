/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import classnames from 'classnames';
import {
  useNodeRender,
  WorkflowNodeProps,
  WorkflowNodeRenderer,
} from '@flowgram.ai/free-layout-editor';

export const NodeRender = (props: WorkflowNodeProps) => {
  const { form, selected } = useNodeRender();
  return (
    <WorkflowNodeRenderer
      className={classnames(
        'workflow-node-render min-w-xs p-4 bg-node-bg rounded-node-radius shadow-[var(--node-shadow)] border border-solid border-node-border',
        {
          'border-node-selected ': selected,
        }
      )}
      node={props.node}
    >
      {form?.render()}
    </WorkflowNodeRenderer>
  );
};
