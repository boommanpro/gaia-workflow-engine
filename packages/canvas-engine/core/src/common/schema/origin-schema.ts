/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { OriginSchemaDecoration, Schema } from '@flowgram.ai/utils';
import type { OriginSchema } from '@flowgram.ai/utils';

import { EntityData } from '../entity-data';

export { OriginSchema, OriginSchemaDecoration };

export class OriginData extends EntityData<OriginSchema> implements OriginSchema {
  static type = 'OriginData';

  getDefaultData(): OriginSchema {
    return Schema.createDefault<OriginSchema>(OriginSchemaDecoration);
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
