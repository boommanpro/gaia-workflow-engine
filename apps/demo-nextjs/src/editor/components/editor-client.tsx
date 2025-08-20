/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

'use client';
import { useEffect, useState } from 'react';

import { Editor } from './editor';

export const EditorClient = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // only render <Editor /> in browser client
    return null;
  }

  return <Editor />;
};
