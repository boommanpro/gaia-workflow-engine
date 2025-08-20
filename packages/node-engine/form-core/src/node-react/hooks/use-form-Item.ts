/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect } from 'react';

import { FlowNodeEntity } from '@flowgram.ai/document';
import { useEntityFromContext, useRefresh } from '@flowgram.ai/core';

import { FlowNodeFormData, FormModel, IFormItem } from '../../form';

export function useFormItem(path: string): IFormItem | undefined {
  const refresh = useRefresh();
  const node = useEntityFromContext<FlowNodeEntity>();
  const formData = node.getData<FlowNodeFormData>(FlowNodeFormData);
  const formItem = formData.getFormModel<FormModel>().getFormItemByPath(path);

  useEffect(() => {
    const disposable = formData.onDataChange(() => {
      refresh();
    });

    return () => {
      disposable.dispose();
    };
  }, []);

  return formItem;
}
