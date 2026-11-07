import { useCallback, useRef } from 'react';

import * as monaco from 'monaco-editor';
import { Modal } from '@douyinfe/semi-ui';

import { MonacoEditor } from '../monaco-editor';
import { useLanguage, t } from '../../i18n';

export const CodeEditorModal = ({
  value,
  onChange,
  language,
  visible,
  handleOk,
  handleCancel,
  onVisibleChange, // 新增：用于控制 Modal 的显示/隐藏
  options: externalOptions, // 新增：支持外部传递 options
  title,
  fullScreen = true,
}: {
  value: string;
  onChange?: (value: string) => void;
  language: string;
  visible: boolean;
  handleOk?: () => void;
  handleCancel?: () => void;
  onVisibleChange?: (visible: boolean) => void; // 新增：控制 Modal 的显示/隐藏
  options?: monaco.editor.IStandaloneEditorConstructionOptions; // 新增：支持外部传递 options
  /** 弹窗标题（默认「代码编辑器」） */
  title?: string;
  /** 全屏形态（默认 true）；2026-11-07 用户决策：DSL 编辑器与查看 Schema 均传 false（960px 居中非全屏） */
  fullScreen?: boolean;
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  useLanguage();

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
      title={title ?? t('codeEditor.title')}
      visible={visible}
      onOk={handleCurrentOk}
      onCancel={handleCurrentCancel}
      closeOnEsc
      fullScreen={fullScreen}
      {...(fullScreen
        ? {}
        : {
            width: 960,
            centered: true,
            bodyStyle: { height: '64vh', padding: 0 },
          })}
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
