/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { typeEditorUtils } from '../utils';
import { ClipboardService } from '../../../services';
import { useService, useTypeDefinitionManager } from '../../../contexts';

export type PasteDataType<TypeSchema> =
  | {
      type: 'single';
      value: TypeSchema;
    }
  | {
      type: 'multiple';
      value: TypeSchema[];
    }
  | {
      type: 'invalid';
    };

export const usePasteData = <TypeSchema extends Partial<IJsonSchema>>() => {
  const clipboard = useService<ClipboardService>(ClipboardService);

  const [pasteData, setPasteData] = useState<PasteDataType<TypeSchema>>({
    type: 'invalid',
  });

  const typeDefinition = useTypeDefinitionManager();

  const pasteDataFormate = useMemo(
    () =>
      (data: string): PasteDataType<TypeSchema> => {
        const parseData = typeEditorUtils.jsonParse(data);

        if (!parseData || typeof parseData !== 'object') {
          return {
            type: 'invalid',
          };
        }

        if (Array.isArray(parseData)) {
          const isValid = parseData.every((item) => {
            const config = typeDefinition.getTypeBySchema(item);
            return !!config;
          });

          if (isValid) {
            return {
              type: 'multiple',
              value: parseData,
            };
          } else {
            return {
              type: 'invalid',
            };
          }
        } else {
          const config = typeDefinition.getTypeBySchema(parseData);

          if (config) {
            return {
              type: 'single',
              value: parseData,
            };
          } else {
            return {
              type: 'invalid',
            };
          }
        }
      },
    [typeDefinition]
  );

  useEffect(() => {
    clipboard.readData().then(
      (v) => {
        if (v !== undefined) {
          setPasteData(pasteDataFormate(v));
        }
      },
      (error) => {
        // console.log(error);
      }
    );

    const dispose = clipboard.onClipboardChanged((newData) => {
      setPasteData(pasteDataFormate(newData));
    });

    return () => {
      dispose.dispose();
    };
  }, [pasteDataFormate]);

  return {
    pasteDataFormate,
    pasteData,
  };
};
