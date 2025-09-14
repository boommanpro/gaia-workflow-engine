/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ServerConfig } from '../../type';

export const DEFAULT_SERVER_CONFIG: ServerConfig = {
  domain: process.env.REACT_APP_SERVER_DOMAIN as string ,
  port: parseInt(process.env.REACT_APP_SERVER_PORT as string),
  protocol: process.env.REACT_APP_SERVER_PROTOCOL,
};
