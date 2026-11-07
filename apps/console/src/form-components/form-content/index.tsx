import React, { useContext, useRef, useState } from 'react';

import { Field, FieldRenderProps } from '@flowgram.ai/free-layout-editor';
import { Input, TextArea } from '@douyinfe/semi-ui';

import { t } from '../../i18n';
import { useIsSidebar } from '../../hooks';
import { NodeRenderContext } from '../../context';
import { CanvasDescription, EmptyHint, FormTitleDescription, FormWrapper } from './styles';
import { Feedback } from '../feedback';

/**
 * 节点描述（2026-11-05 改版）：
 * · 完全可空——为空时画布卡片整行不渲染（零占位），侧栏显示「双击添加描述」引导行；
 * · 双击就地编辑：画布单行 Input（Enter 保存 / Esc 取消 / 失焦保存），侧栏 TextArea；
 * · 不再回填 i18n 默认文案——旧实现 `value || 默认文案` 让描述永远至少占一行且清不掉。
 * 编辑事件 stopPropagation，避免冒泡到 NodeWrapper 的「点击打开表单面板」。
 */
export function FormContent(props: { children?: React.ReactNode }) {
  const { readonly } = useContext(NodeRenderContext);

  const isSidebar = useIsSidebar();
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<any>(null);

  const startEdit = () => {
    if (readonly) return;
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const stopEdit = () => setIsEditing(false);

  const commit = (onChange: (value: string) => void) => {
    onChange(inputRef.current?.value || '');
    stopEdit();
  };

  const renderEditor = (value: string, onChange: (v: string) => void) => {
    const stop = (e: React.SyntheticEvent) => e.stopPropagation();
    if (isSidebar) {
      return (
        <div onClick={stop} onDoubleClick={stop}>
          <TextArea
            ref={inputRef}
            autosize
            defaultValue={value || ''}
            onBlur={() => commit(onChange)}
            onEnterPress={() => commit(onChange)}
          />
        </div>
      );
    }
    return (
      <div onClick={stop} onDoubleClick={stop} onMouseDown={stop}>
        <Input
          ref={inputRef}
          size="small"
          defaultValue={value || ''}
          onBlur={() => commit(onChange)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(onChange);
            if (e.key === 'Escape') stopEdit();
          }}
        />
      </div>
    );
  };

  return (
    <FormWrapper>
      <Field name="description">
        {({ field: { value, onChange }, fieldState }: FieldRenderProps<string>) => (
          <>
            {isEditing ? (
              renderEditor(value, onChange)
            ) : value ? (
              isSidebar ? (
                <FormTitleDescription onDoubleClick={startEdit} title={t('nodeDesc.editHint')}>
                  {value}
                </FormTitleDescription>
              ) : (
                <CanvasDescription onDoubleClick={startEdit} title={t('nodeDesc.editHint')}>
                  {value}
                </CanvasDescription>
              )
            ) : isSidebar ? (
              <EmptyHint onDoubleClick={startEdit}>{t('nodeDesc.placeholder')}</EmptyHint>
            ) : null}
            <Feedback errors={fieldState?.errors} />
          </>
        )}
      </Field>
      {props.children}
    </FormWrapper>
  );
}
