/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';

import { typeSelectorUtils } from '../utils';
import { type CascaderOption } from '../type';
import { useTypeDefinitionManager } from '../../../contexts';

const genId = (options: CascaderOption[]): string =>
  options.map((v) => `${v.disabled}${v.label}`).join('-');

export const useCascaderRootTypes = (customDisableType: Map<string, string>) => {
  const [rootTypes, setRootTypes] = useState<CascaderOption[]>([]);
  const typeService = useTypeDefinitionManager();

  useEffect(() => {
    const init = () => {
      const newRootTypes = typeService.getTypeRegistriesWithParentType().map((config) => {
        const res = typeSelectorUtils.definitionToCascaderOption({
          customDisableType,
          config,
          level: 0,
          parentTypes: [],
        });
        return res;
      });

      if (genId(newRootTypes) !== genId(rootTypes)) {
        setRootTypes(newRootTypes);
      }
    };
    init();
    const dispose = typeService.onTypeRegistryChange(init);
    return () => {
      dispose.dispose();
    };
  }, [rootTypes, customDisableType]);

  return rootTypes;
};
