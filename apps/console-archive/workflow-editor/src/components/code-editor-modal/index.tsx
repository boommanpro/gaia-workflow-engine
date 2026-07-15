import React, { useCallback, useRef } from 'react';

import * as monaco from 'monaco-editor';
import { Modal } from '@douyinfe/semi-ui';

import { MonacoEditor } from '../monaco-editor';

export const CodeEditorModal = ({
  value,
  onChange,
  language,
  visible,
  handleOk,
  handleCancel,
  onVisibleChange, // 新增：用于控制 Modal 的显示/隐藏
  options: externalOptions, // 新增：支持外部传递 options
}: {
  value: string;
  onChange?: (value: string) => void;
  language: string;
  visible: boolean;
  handleOk?: () => void;
  handleCancel?: () => void;
  onVisibleChange?: (visible: boolean) => void; // 新增：控制 Modal 的显示/隐藏
  options?: monaco.editor.IStandaloneEditorConstructionOptions; // 新增：支持外部传递 options
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleCurrentOk = useCallback(() => {
    const editorValue = editorRef.current?.getValue();
    if (onChange) {
      onChange(editorValue || '');
    }
    if (handleOk) {
      handleOk();
    }
    if (onVisibleChange) {
      onVisibleChange(false); // 隐藏 Modal
    }
  }, [onChange, handleOk, onVisibleChange]);

  const handleCurrentCancel = useCallback(() => {
    if (handleCancel) {
      handleCancel();
    }
    if (onVisibleChange) {
      onVisibleChange(false); // 隐藏 Modal
    }
  }, [handleCancel, onVisibleChange]);

  // 默认配置
  const defaultOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    fontSize: 14,
    lineNumbers: 'on',
    minimap: { enabled: false },
  };

  const mergedOptions = { ...defaultOptions, ...externalOptions };

  return (
    <Modal
      title="代码编辑器"
      visible={visible}
      onOk={handleCurrentOk}
      onCancel={handleCurrentCancel}
      closeOnEsc
      fullScreen
      style={{ zIndex: 1000 }}
      getPopupContainer={() => document.body}
    >
      <MonacoEditor
        value={value}
        style={{ width: '100%', height: '100%' }}
        language={language}
        theme="vs-dark"
        options={mergedOptions}
        editorRef={editorRef}
      />
    </Modal>
  );
};
