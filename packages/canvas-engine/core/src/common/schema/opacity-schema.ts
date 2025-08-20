/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { OpacitySchemaDecoration, Schema } from '@flowgram.ai/utils';
import type { OpacitySchema } from '@flowgram.ai/utils';

import { EntityData } from '../entity-data';

export { OpacitySchema, OpacitySchemaDecoration };

export class OpacityData extends EntityData<OpacitySchema> {
  static type = 'OpacityData';

  getDefaultData(): OpacitySchema {
    return Schema.createDefault<OpacitySchema>(OpacitySchemaDecoration);
  }
}
