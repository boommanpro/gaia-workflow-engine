/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { TypeEditorRegistry } from '../../../types';
import { useTypeDefinitionManager } from '../../../contexts';

export const useTypeTransform = () => {
  const typeService = useTypeDefinitionManager();

  /**
   * 根据提交值获取选项值
   * 正常和 OptionValue 一致，不用特殊转化
   * 但是在 IJsonSchema 的场景，这两个值会不同
   * 级联场景也会不一样，因为 级联场景会 type-type
   */
  const convertValueToOptionValue = useMemo(
    () => (originValue: IJsonSchema | undefined) => {
      const type = originValue && typeService.getTypeBySchema(originValue);

      return (originValue && type?.getStringValueByTypeSchema?.(originValue)) || '';
    },
    [typeService]
  );

  /**
   * 根据选项值获取提交值
   * 正常和 OptionValue 一致，不用特殊转化
   * 但是在 IJsonSchema 的场景，这两个值会不同
   * 级联场景也会不一样，因为 级联场景会 type-type
   */
  const convertOptionValueToModeValue = useMemo(
    () => (optionValue: string | undefined) => {
      const [root, ...rest] = (optionValue || '').split('-');

      const rooType = typeService.getTypeByName(root);

      if (rooType?.getTypeSchemaByStringValue) {
        return rooType.getTypeSchemaByStringValue(rest.join('-'));
      }

      return rooType?.getDefaultSchema();
    },
    [typeService]
  );

  /**
   * 判断是否有子类型
   */
  const checkHasChildren = useMemo(
    () =>
      (
        typeDef: TypeEditorRegistry<IJsonSchema>,
        ctx: {
          level: number;
        }
      ): boolean =>
        (typeDef?.getSupportedItemTypes && typeDef.getSupportedItemTypes(ctx).length !== 0) ||
        !!typeDef.container,
    [typeService]
  );

  const getModeOptionChildrenType = useMemo(
    () =>
      (
        typeDef: TypeEditorRegistry<IJsonSchema> | undefined,
        ctx: {
          parentType: string;
          level: number;
          parentTypes?: string[];
        }
      ) => {
        const getSupportType = (parentType = ''): TypeEditorRegistry<IJsonSchema>[] =>
          typeService.getTypeRegistriesWithParentType(
            parentType
          ) as TypeEditorRegistry<IJsonSchema>[];

        const support = new Set(getSupportType(ctx.parentType).map((v) => v.type));
        return (
          (typeDef?.getSupportedItemTypes && typeDef.getSupportedItemTypes(ctx)) ||
          []
        ).filter((v) => support.has(v.type));
      },
    [typeService]
  );

  return {
    convertOptionValueToModeValue,
    convertValueToOptionValue,
    checkHasChildren,
    getModeOptionChildrenType,
  };
};
