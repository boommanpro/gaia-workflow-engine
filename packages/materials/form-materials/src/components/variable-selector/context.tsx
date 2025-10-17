/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { createContext, useContext, useMemo } from 'react';

import { BaseVariableField } from '@flowgram.ai/editor';

export const VariableSelectorContext = createContext<{
  skipVariable?: (variable?: BaseVariableField) => boolean;
}>({});

export const useVariableSelectorContext = () => useContext(VariableSelectorContext);

export const VariableSelectorProvider = ({
  children,
  skipVariable,
}: {
  skipVariable?: (variable?: BaseVariableField) => boolean;
  children: React.ReactNode;
}) => {
  const context = useMemo(() => ({ skipVariable }), [skipVariable]);

  return (
    <VariableSelectorContext.Provider value={context}>{children}</VariableSelectorContext.Provider>
  );
};
