/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from 'react';

import { useDark } from '@rspress/core/runtime';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
} from '@codesandbox/sandpack-react';

export const TsxEditor = ({ value }: { value: string }) => {
  const dark = useDark();
  const theme = useMemo(() => (dark ? 'dark' : 'light'), [dark]);

  return (
    <SandpackProvider
      template="react"
      theme={theme}
      files={{
        'App.js': value,
      }}
      onChange={(v) => {
        console.log('debugger', v);
      }}
    >
      <SandpackLayout>
        <SandpackPreview />
      </SandpackLayout>
      <SandpackLayout>
        <SandpackCodeEditor />
      </SandpackLayout>
    </SandpackProvider>
  );
};
