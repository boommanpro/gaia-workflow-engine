/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect } from 'vitest';

import { logger } from './logger';

describe('logger', () => {
  const consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const consoleInfoMock = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  const consoleWarnMock = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  afterAll(() => {
    consoleLogMock.mockReset();
    consoleInfoMock.mockReset();
    consoleWarnMock.mockReset();
    consoleErrorMock.mockReset();
  });

  test('log', () => {
    logger.log('log');
    expect(consoleLogMock).not.toHaveBeenCalledOnce();
  });
  test('info', () => {
    logger.info('info');
    expect(consoleInfoMock).not.toHaveBeenCalledOnce();
  });
  test('error', () => {
    logger.error('error');
    expect(consoleErrorMock).toHaveBeenCalledOnce();
  });
  test('warn', () => {
    logger.warn('warn');
    expect(consoleWarnMock).toHaveBeenCalledOnce();
  });

  test('develop', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(logger.isDevEnv()).toEqual(false);
  });
  test('develop', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(logger.isDevEnv()).toEqual(true);
  });
});
