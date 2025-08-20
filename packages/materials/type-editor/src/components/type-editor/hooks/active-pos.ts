/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { TypeEditorService } from '../../../services';
import { useService } from '../../../contexts';

export const useActivePos = (): TypeEditorService<IJsonSchema>['activePos'] => {
  const typeEditorService = useService<TypeEditorService<IJsonSchema>>(TypeEditorService);

  const [activePos, setActivePos] = useState<{ x: number; y: number }>(typeEditorService.activePos);

  useEffect(() => {
    const dispose = typeEditorService.onActivePosChange.event((v) => {
      setActivePos(v);
    });
    return () => {
      dispose.dispose();
    };
  }, []);

  return activePos;
};
