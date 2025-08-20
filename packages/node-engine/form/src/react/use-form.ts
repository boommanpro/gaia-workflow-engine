/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Form } from '../types';
import { toForm } from '../core/to-form';
import { useFormModel } from './utils';

/**
 * Get Form instance. It should be use in a child component of  <Form />
 */
export function useForm(): Form {
  const formModel = useFormModel();
  return toForm(formModel);
}
