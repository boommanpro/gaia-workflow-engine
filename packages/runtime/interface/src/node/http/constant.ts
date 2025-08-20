/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export enum HTTPMethod {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Delete = 'DELETE',
  Patch = 'PATCH',
  Head = 'HEAD',
}

export enum HTTPBodyType {
  None = 'none',
  FormData = 'form-data',
  XWwwFormUrlencoded = 'x-www-form-urlencoded',
  RawText = 'raw-text',
  JSON = 'JSON',
  Binary = 'binary',
}
