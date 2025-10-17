/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { ComponentType, lazy, Suspense } from 'react';

import { Skeleton } from '@douyinfe/semi-ui';

export function withSuspense<T extends ComponentType<any>>(
  Component: T,
  fallback?: React.ReactNode
): T {
  const WithSuspenseComponent: T = ((props: any) => (
    <Suspense fallback={fallback || <Skeleton.Paragraph style={{ width: '100%' }} rows={1} />}>
      <Component {...props} />
    </Suspense>
  )) as any;

  return WithSuspenseComponent;
}

export function lazySuspense<T extends ComponentType<any>>(
  params: Parameters<typeof lazy<T>>[0],
  fallback?: React.ReactNode
) {
  return withSuspense(lazy(params), fallback);
}
