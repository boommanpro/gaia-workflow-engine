/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { PositionSchemaDecoration, Schema } from '@flowgram.ai/utils';
import type { PositionSchema } from '@flowgram.ai/utils';

import { EntityData } from '../entity-data';

export { PositionSchema, PositionSchemaDecoration };

export class PositionData extends EntityData<PositionSchema> implements PositionSchema {
  static type = 'PositionData';

  getDefaultData(): PositionSchema {
    return Schema.createDefault<PositionSchema>(PositionSchemaDecoration);
  }

  get x(): number {
    return this.data.x;
  }

  get y(): number {
    return this.data.y;
  }

  set x(x: number) {
    this.update('x', x);
  }

  set y(y: number) {
    this.update('y', y);
  }
}
