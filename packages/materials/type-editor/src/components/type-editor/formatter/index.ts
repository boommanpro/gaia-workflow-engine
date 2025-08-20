/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { SUFFIX } from '../common';
export type Formatter = (typeSchema: Partial<IJsonSchema>) => void;

export const extraFormatter: Formatter = (type) => {
  if (type.extra !== undefined) {
    type.extra = type.extra;

    delete type.extra;
  }
};

export const extraDeFormatter: Formatter = (type) => {
  if (type.extra !== undefined) {
    type.extra = type.extra;
    delete type.extra;
  }
};

export const emptyKeyFormatter: Formatter = (type) => {
  if (type.properties) {
    Object.keys(type.properties).forEach((k) => {
      if (k.startsWith(SUFFIX)) {
        delete type.properties![k];
      }
    });
  }
};

export const disableFixIndexFormatter: Formatter = (type) => {
  if (type.extra) {
    delete type.extra.index;

    if (Object.keys(type.extra).length === 0) {
      delete type.extra;
    }
  }
};
