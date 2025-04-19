// src/components/RunNodeSidebar/index.tsx

import React, { useState } from 'react';

import { Typography, Input, Select, Card, Button, Collapse } from '@douyinfe/semi-ui';
import { IconCopy, IconDownload } from '@douyinfe/semi-icons';

const RunNodeSidebar: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>('');
  const [runResult, setRunResult] = useState<string[]>([]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const handleRun = () => {
    // 模拟运行逻辑
    setRunResult(['key1 [2]', 'key2 [1]']);
  };

  return (
    <div style={{ padding: '20px' }}>
      <Typography.Title heading={5}>试运行</Typography.Title>

      <Typography.Text type="secondary" style={{ marginBottom: '10px' }}>
        试运行输入
      </Typography.Text>
      <Select
        style={{ width: '100%', marginBottom: '10px' }}
        defaultValue="JSON模式"
        options={[
          { value: 'json', label: 'JSON模式' },
          { value: 'text', label: '文本模式' },
        ]}
      />
      <Input
        style={{ width: '100%', marginBottom: '20px' }}
        value={inputValue}
        onChange={handleInputChange}
        placeholder="请输入"
      />

      <Typography.Text type="secondary" style={{ marginBottom: '10px' }}>
        运行结果
      </Typography.Text>
      <Card style={{ marginBottom: '20px' }}>
        <Typography.Title heading={6}>输入</Typography.Title>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Typography.Text code>{`a: "${inputValue}"`}</Typography.Text>
          <Button icon={<IconCopy />} theme="borderless" style={{ marginLeft: '10px' }} />
          <Button icon={<IconDownload />} theme="borderless" style={{ marginLeft: '10px' }} />
        </div>
      </Card>
      <Card>
        <Collapse defaultActiveKey={['1']}>
          <Collapse.Panel key="1" header="输出">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography.Text type="secondary">节点输出</Typography.Text>
              <Typography.Text type="secondary">代码输出</Typography.Text>
            </div>
            <div style={{ marginTop: '10px' }}>
              {runResult.map((item, index) => (
                <Typography.Text key={index} style={{ display: 'block', marginTop: '5px' }}>
                  {item}
                </Typography.Text>
              ))}
            </div>
          </Collapse.Panel>
        </Collapse>
      </Card>

      <Button type="primary" block onClick={handleRun} style={{ marginTop: '20px' }}>
        运行
      </Button>
    </div>
  );
};

export default RunNodeSidebar;
