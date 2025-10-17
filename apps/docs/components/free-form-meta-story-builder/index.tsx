/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

const OriginFreeFormMetaStoryBuilder = React.lazy(() =>
  import('@flowgram.ai/demo-materials').then((module) => ({
    default: module.FreeFormMetaStoryBuilder,
  }))
);

const FormHeader = React.lazy(() =>
  import('@flowgram.ai/demo-materials').then((module) => ({
    default: module.FormHeader,
  }))
);

const FreeFormMetaStoryBuilder = (
  props: React.ComponentPropsWithoutRef<typeof OriginFreeFormMetaStoryBuilder> & {
    height?: number | string;
  }
) => (
  <div style={{ position: 'relative', height: props.height || 400 }}>
    <OriginFreeFormMetaStoryBuilder {...props} />
  </div>
);

export { FreeFormMetaStoryBuilder, FormHeader };
