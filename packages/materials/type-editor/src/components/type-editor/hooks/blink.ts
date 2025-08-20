/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { TypeEditorService } from '../../../services';
import { useService } from '../../../contexts';

export const useIsBlink = () => {
  const typeEditor = useService<TypeEditorService<IJsonSchema>>(TypeEditorService);

  const blinkData = useMemo(() => typeEditor.blink, [typeEditor.blink]);
  const [blink, setBlink] = useState(blinkData.data);

  useEffect(() => {
    const dispose = blinkData.onDataChange(({ next }) => {
      setBlink(next);

      if (next) {
        setTimeout(() => {
          blinkData.update(false);
        }, 200);
      }
    });

    return () => {
      dispose.dispose();
    };
  }, [blinkData]);

  return blink;
};
