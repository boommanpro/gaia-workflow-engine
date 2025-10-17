/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import * as React from 'react';

import { isFunction } from 'lodash-es';
import { DisposableCollection, useRefresh } from '@flowgram.ai/utils';
import { useReadonlyReactiveState } from '@flowgram.ai/reactive';

import { toField, toFieldState } from 'src/core/to-field';
import { FieldModelState, FieldName, FieldOptions, FieldRenderProps } from '../types/field';
import { FormModelState } from '../types';
import { toFormState } from '../core/to-form';
import { useFormModel } from './utils';
import { FieldModelContext } from './context';

export type FieldProps<TValue> = FieldOptions<TValue> & {
  /**
   * A React element or a render prop
   */
  children?: ((props: FieldRenderProps<TValue>) => React.ReactElement) | React.ReactElement;
  /**
   * Dependencies of the current field. If a field name is given in deps, current field will re-render if the given field name data is updated
   */
  deps?: FieldName[];
};

/**
 * HOC That declare a field, an Field model will be created it's rendered. Multiple Field rendering with a same name will link to the same model, which means they shared data、 status and methods
 */
export function Field<TValue>({
  name,
  defaultValue,
  render,
  children,
  deps,
}: FieldProps<TValue>): React.ReactElement {
  const formModel = useFormModel();

  const fieldModel = formModel.getField(name) || formModel.createField(name);
  const field = React.useMemo(() => toField<TValue>(fieldModel), [fieldModel]);

  const fieldModelState = useReadonlyReactiveState<FieldModelState>(fieldModel.reactiveState);
  const formModelState = useReadonlyReactiveState<FormModelState>(formModel.reactiveState);

  const fieldState = React.useMemo(() => toFieldState(fieldModelState), [fieldModelState]);
  const formState = toFormState(formModelState);

  const refresh = useRefresh();

  React.useEffect(() => {
    // 当 Field 加上 key 且 key 变化时候会销毁 FieldModel
    if (fieldModel.disposed) {
      refresh();
      return () => {};
    }
    fieldModel.renderCount = fieldModel.renderCount + 1;

    if (!formModel.getValueIn(name) !== undefined && defaultValue !== undefined) {
      formModel.setInitValueIn(name, defaultValue);
      refresh();
    }

    const disposableCollection = new DisposableCollection();

    disposableCollection.push(
      fieldModel.onValueChange(() => {
        refresh();
      })
    );

    if (deps) {
      deps.forEach((dep) => {
        const disposable = formModel.getField(dep)?.onValueChange(() => {
          refresh();
        });
        if (disposable) {
          disposableCollection.push(disposable);
        }
      });
    }
    return () => {
      disposableCollection.dispose();

      if (fieldModel.renderCount > 1) {
        fieldModel.renderCount = fieldModel.renderCount - 1;
      } else {
        const newFieldModel = formModel.getField(fieldModel.name);
        if (newFieldModel === fieldModel) fieldModel.dispose();
      }
    };
  }, [fieldModel]);

  const renderInner = () => {
    if (render) {
      return render({ field, fieldState, formState });
    }

    if (isFunction(children)) {
      return children({ field, fieldState, formState });
    }

    return React.cloneElement(children as React.ReactElement, { ...field });
  };
  if (fieldModel.disposed) return <></>;

  return (
    <FieldModelContext.Provider value={fieldModel}>{renderInner()}</FieldModelContext.Provider>
  );
}
