/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IJsonSchema } from '@flowgram.ai/json-schema';

export const traverseIJsonSchema = (
  root: Partial<IJsonSchema> | undefined,
  cb: (type: Partial<IJsonSchema>) => void
): void => {
  if (root) {
    cb(root);

    if (root.items) {
      traverseIJsonSchema(root.items, cb);
    }
    if (root.additionalProperties) {
      traverseIJsonSchema(root.additionalProperties, cb);
    }

    if (root.properties) {
      Object.values(root.properties).forEach((v) => {
        traverseIJsonSchema(v, cb);
      });
    }
  }
};
