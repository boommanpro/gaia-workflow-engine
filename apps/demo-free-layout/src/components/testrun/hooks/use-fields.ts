/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { TestRunFormField, TestRunFormMeta } from '../testrun-form/type';

export const useFields = (params: {
  formMeta: TestRunFormMeta;
  values: Record<string, unknown>;
  setValues: (values: Record<string, unknown>) => void;
}): TestRunFormField[] => {
  const { formMeta, values, setValues } = params;

  // Convert each meta item to a form field with value and onChange handler
  const fields: TestRunFormField[] = formMeta.map((meta) => {
    // Handle object type specially - serialize object to JSON string for display
    const getCurrentValue = (): unknown => {
      const rawValue = values[meta.name] ?? meta.defaultValue;
      if ((meta.type === 'object' || meta.type === 'array') && rawValue !== null) {
        return JSON.stringify(rawValue, null, 2);
      }
      return rawValue;
    };

    const currentValue = getCurrentValue();

    const handleChange = (newValue: unknown): void => {
      if (meta.type === 'object' || meta.type === 'array') {
        setValues({
          ...values,
          [meta.name]: JSON.parse((newValue ?? '{}') as string),
        });
      } else {
        setValues({
          ...values,
          [meta.name]: newValue,
        });
      }
    };

    return {
      ...meta,
      value: currentValue,
      onChange: handleChange,
    };
  });

  return fields;
};
