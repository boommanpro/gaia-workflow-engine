/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';

import { hasError } from '../src/utils/validate';
import { FeedbackLevel, FieldError } from '../src/types';

describe('utils/validate', () => {
  describe('hasError', () => {
    it('should return false when errors is empty', () => {
      expect(hasError({ xxx: [] })).toBe(false);
      expect(hasError({ xxx: undefined })).toBe(false);
      expect(hasError({})).toBe(false);
      expect(hasError({ aaa: [], bbb: [] })).toBe(false);
      expect(hasError({ aaa: undefined, bbb: [] })).toBe(false);
    });
    it('should return true when errors is not empty', () => {
      const mockError: FieldError = { name: 'xxx', level: FeedbackLevel.Error, message: 'err' };
      expect(hasError({ xxx: [mockError] })).toBe(true);
      expect(hasError({ aaa: [mockError], bbb: [mockError] })).toBe(true);
      expect(hasError({ aaa: undefined, bbb: [mockError] })).toBe(true);
    });
  });
});
