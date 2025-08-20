/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';

import { FormPathService } from '../src/form/services/form-path-service';

describe('FormPathService', () => {
  it('should parse array item path correctly', () => {
    const path = 'a/b/2/description';
    const result = FormPathService.parseArrayItemPath(path);

    expect(result).toEqual({
      itemIndex: 2,
      arrayPath: 'a/b/[]',
      itemMetaPath: 'a/b/[]/description',
    });
  });

  it('should handle non-numeric item index correctly', () => {
    const path = 'a/b';
    const result = FormPathService.parseArrayItemPath(path);

    expect(result).toBeNull();
  });

  it('should handle empty path correctly', () => {
    const path = '';
    const result = FormPathService.parseArrayItemPath(path);

    expect(result).toBeNull();
  });
});
