/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { ModeValueConfig, TypeEditorMode, TypeEditorProp, TypeEditorValue } from '../type';
import { modeValueConfig } from '../mode';
import { extraDeFormatter, extraFormatter, Formatter } from '../formatter';
import { traverseIJsonSchema } from '../../../services/utils';

export const useFormatter = <Mode extends TypeEditorMode, TypeSchema extends Partial<IJsonSchema>>({
  extraConfig = {},
  mode,
}: Pick<TypeEditorProp<Mode, TypeSchema>, 'mode' | 'extraConfig'>) => {
  const { useExtra } = extraConfig;
  const modeConfig = useMemo(
    () =>
      modeValueConfig.find((v) => v.mode === mode)! as unknown as ModeValueConfig<Mode, TypeSchema>,
    [mode]
  );

  const formatter = useMemo(
    () => (value: TypeEditorValue<Mode, TypeSchema> | undefined) => {
      const originSchema = value && modeConfig.convertValueToSchema(value as any);
      let res = originSchema ? JSON.parse(JSON.stringify(originSchema)) : originSchema;

      const formatters: Formatter[] = [];
      if (useExtra) {
        formatters.push(extraFormatter);
      }

      if (formatters.length !== 0 && res) {
        traverseIJsonSchema(res, (type) => {
          formatters.forEach((f) => f(type));
        });
      }
      return res;
    },
    [modeConfig, useExtra]
  );

  const deFormatter = useMemo(
    () => (originSchema: TypeSchema | undefined) => {
      let schema = originSchema ? JSON.parse(JSON.stringify(originSchema)) : originSchema;

      const formatters: Formatter[] = [];
      if (useExtra) {
        formatters.push(extraDeFormatter);
      }

      if (formatters.length !== 0 && schema) {
        traverseIJsonSchema(schema, (type) => {
          formatters.forEach((f) => f(type));
        });
      }

      return schema && modeConfig.convertSchemaToValue(schema as TypeSchema);
    },
    [modeConfig, useExtra]
  );

  return {
    formatter,
    deFormatter,
  };
};
