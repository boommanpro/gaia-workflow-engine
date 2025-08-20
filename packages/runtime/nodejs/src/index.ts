/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { createServer } from '@server/index';

async function main() {
  const server = await createServer();
  server.start();
}

main();
