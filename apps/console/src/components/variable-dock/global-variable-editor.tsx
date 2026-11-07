/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 *
 * 全局变量编辑器（自 plugins/variable-panel-plugin/components 迁入，逻辑不变：
 * 直接编辑 GlobalScope 根变量的 JsonSchema —— 2026-11-05 变量 Dock 改版）。
 */

import { useEffect } from 'react';

import {
  BaseVariableField,
  GlobalScope,
  useRefresh,
  useService,
} from '@flowgram.ai/free-layout-editor';
import { JsonSchemaEditor, JsonSchemaUtils } from '@flowgram.ai/form-materials';

export function GlobalVariableEditor() {
  const globalScope = useService(GlobalScope);

  const refresh = useRefresh();

  const globalVar = globalScope.getVar() as BaseVariableField;

  useEffect(() => {
    const disposable = globalScope.output.onVariableListChange(() => {
      refresh();
    });

    return () => {
      disposable.dispose();
    };
  }, []);

  if (!globalVar) {
    return null;
  }

  const value = globalVar.type ? JsonSchemaUtils.astToSchema(globalVar.type) : { type: 'object' };

  return (
    <JsonSchemaEditor
      value={value}
      onChange={(_schema) => globalVar.updateType(JsonSchemaUtils.schemaToAST(_schema))}
    />
  );
}
