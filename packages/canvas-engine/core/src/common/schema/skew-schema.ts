/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { SkewSchemaDecoration, Schema } from '@flowgram.ai/utils';
import type { SkewSchema } from '@flowgram.ai/utils';

import { EntityData } from '../entity-data';

export { SkewSchema, SkewSchemaDecoration };

export class SkewData extends EntityData<SkewSchema> implements SkewSchema {
  static type = 'SkewData';

  getDefaultData(): SkewSchema {
    return Schema.createDefault<SkewSchema>(SkewSchemaDecoration);
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
