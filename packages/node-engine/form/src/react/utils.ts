/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useContext } from 'react';

import { FormModel } from '../core/form-model';
import { FormModelContext } from './context';

export function useFormModel(): FormModel {
  return useContext<FormModel>(FormModelContext);
}
