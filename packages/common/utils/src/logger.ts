/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

class Logger {
  isDevEnv() {
    return process.env.NODE_ENV === 'development';
  }

  info(...props: any) {
    if (!this.isDevEnv()) return;
    // eslint-disable-next-line no-console
    return console.info(props);
  }

  log(...props: any) {
    if (!this.isDevEnv()) return;
    // eslint-disable-next-line no-console
    return console.log(...props);
  }

  error(...props: any) {
    return console.error(...props);
  }

  warn(...props: any) {
    return console.warn(...props);
  }
}

export const logger = new Logger();
