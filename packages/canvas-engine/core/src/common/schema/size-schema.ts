/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { SizeSchema, SizeSchemaDecoration, Schema } from '@flowgram.ai/utils';

import { EntityData } from '../entity-data';

export { SizeSchema, SizeSchemaDecoration };

export class SizeData extends EntityData<SizeSchema> implements SizeSchema {
  static type = 'SizeData';

  getDefaultData(): SizeSchema {
    return Schema.createDefault<SizeSchema>(SizeSchemaDecoration);
  }

  get width(): number {
    return this.data.width;
  }

  get height(): number {
    return this.data.height;
  }

  set width(width: number) {
    this.update('width', width);
  }

  set height(height: number) {
    this.update('height', height);
  }

  get locked(): boolean {
    return !!this.data.locked;
  }

  set locked(locked: boolean) {
    this.update('locked', locked);
  }
}
