// src/components/RunNodeSidebar/index.tsx

import React, { useState } from 'react';

import { isEqual } from 'lodash-es';
import { useClientContext } from '@flowgram.ai/free-layout-editor';
import { Button, Typography } from '@douyinfe/semi-ui';

import { useModal } from '../../hooks/use-code-editor-modal.tsx';
import { RunMixPropertiesEdit } from '../../form-components/run-properties-edit';
import { PropertyItem } from '../../form-components/mix-properties-edit';

const RunNodeSidebar: React.FC = () => {
  const { selection, playground } = useClientContext();
  const [inputs, setInputs] = useState<PropertyItem[]>([]);
  const { openModal, modal } = useModal('', 'json');

  // 确保 Hook 始终被调用
  const data = React.useMemo(() => {
    if (!selection || selection.selection.length !== 1) {
      return null;
    }
    const node = selection.selection[0];
    if (node._metaCache?.hiddenSidebar) {
      return null;
    }
    return node.toJSON();
  }, [selection]);

  React.useEffect(() => {
    if (!data || !Array.isArray(data.data.inputs)) {
      return;
    }
    const newInputs = data.data.inputs as PropertyItem[];
    if (!isEqual(inputs, newInputs)) {
      setInputs(newInputs);
    }
  }, [data, inputs]);

  const handleRun = () => {
    console.log('inputs:', inputs);
    let runData = {
      params: inputs.reduce((acc, item) => {
        if (item.name && item.input?.value?.content !== undefined) {
          acc[item.name] = item.input.value.content;
        }
        return acc;
      }, {} as Record<string, any>),
      node: data,
    };
    console.log('runData:', runData);
    openModal(JSON.stringify(runData, null, 2));
  };

  // 渲染逻辑
  if (!data || !Array.isArray(data.data.inputs)) {
    return null;
  }

  return (
    <div style={{ padding: '20px' }}>
      <Typography.Title heading={5}>试运行</Typography.Title>
      <Typography.Title heading={6}>输入</Typography.Title>
      <RunMixPropertiesEdit
        value={inputs}
        onChange={(value) => {
          setInputs(value);
        }}
      />
      <Button type="primary" block onClick={handleRun} style={{ marginTop: '20px' }}>
        运行
      </Button>
      {modal}
    </div>
  );
};

export default RunNodeSidebar;
