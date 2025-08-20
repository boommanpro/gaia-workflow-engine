import React, { useCallback, useRef, useState } from 'react';

import { Button, Tooltip, theme } from 'antd';
import { CodeOutlined } from '@ant-design/icons';

import { ConstantInput } from '../constant-input';
import { IJsonSchema } from '../../typings';
import { getValueType } from './utils';
import {
  ConstantInputWrapper,
  JSONHeader,
  JSONHeaderLeft,
  JSONHeaderRight,
  JSONViewerWrapper,
} from './styles';

const { useToken } = theme;

/**
 * 根据不同的数据类型渲染对应的默认值输入组件。
 * @param props - 组件属性，包括 value, type, placeholder, onChange。
 * @returns 返回对应类型的输入组件或 null。
 */
export function DefaultValue(props: {
  value: any;
  schema?: IJsonSchema;
  name?: string;
  type?: string;
  placeholder?: string;
  jsonFormatText?: string;
  onChange: (value: any) => void;
}) {
  const { token } = useToken();
  const { value, schema, type, onChange, placeholder, jsonFormatText } = props;

  const wrapperRef = useRef<HTMLDivElement>(null);

  // TODO add JsonViewer
  // const JsonViewerRef = useRef<JsonViewer>(null);

  // 为 JsonViewer 添加状态管理
  const [internalJsonValue, setInternalJsonValue] = useState<string>(
    getValueType(value) === 'string' ? value : ''
  );

  // 使用 useCallback 创建稳定的回调函数
  // const handleJsonChange = useCallback((val: string) => {
  //   // 只在值真正改变时才更新状态
  //   if (val !== internalJsonValue) {
  //     setInternalJsonValue(val);
  //   }
  // }, []);

  // 处理编辑完成事件
  const handleEditComplete = useCallback(() => {
    // 只有当存在key，编辑完成时才触发父组件的 onChange
    onChange(internalJsonValue);
    // 确保在更新后移除焦点
    requestAnimationFrame(() => {
      // JsonViewerRef.current?.format();
      wrapperRef.current?.blur();
    });
    // setJsonReadOnly(true);
  }, [internalJsonValue, onChange]);

  // const [jsonReadOnly, setJsonReadOnly] = useState<boolean>(true);

  const handleFormatJson = useCallback(() => {
    try {
      const parsed = JSON.parse(internalJsonValue);
      const formatted = JSON.stringify(parsed, null, 4);
      setInternalJsonValue(formatted);
      onChange(formatted);
    } catch (error) {
      console.error('Invalid JSON:', error);
    }
  }, [internalJsonValue, onChange]);

  return type === 'object' ? (
    <>
      <JSONHeader>
        <JSONHeaderLeft>json</JSONHeaderLeft>
        <JSONHeaderRight>
          <Tooltip title={jsonFormatText ?? 'Format'}>
            <Button
              icon={<CodeOutlined style={{ color: token.colorPrimary }} />}
              size="small"
              onClick={handleFormatJson}
            />
          </Tooltip>
        </JSONHeaderRight>
      </JSONHeader>

      <JSONViewerWrapper
        ref={wrapperRef}
        tabIndex={-1}
        onBlur={(e) => {
          if (wrapperRef.current && !wrapperRef.current?.contains(e.relatedTarget as Node)) {
            handleEditComplete();
          }
        }}
        onClick={(e: React.MouseEvent) => {
          // setJsonReadOnly(false);
        }}
      >
        {/* <JsonViewer
          ref={JsonViewerRef}
          value={getValueType(value) === 'string' ? value : ''}
          height={120}
          width="100%"
          showSearch={false}
          options={{
            readOnly: jsonReadOnly,
            formatOptions: { tabSize: 4, insertSpaces: true, eol: '\n' },
          }}
          style={{
            padding: 0,
          }}
          onChange={handleJsonChange}
        /> */}
      </JSONViewerWrapper>
    </>
  ) : (
    <ConstantInputWrapper>
      <ConstantInput
        value={value}
        onChange={(_v) => onChange(_v)}
        schema={schema || { type: 'string' }}
        placeholder={placeholder ?? 'Default value if parameter is not provided'}
      />
    </ConstantInputWrapper>
  );
}
