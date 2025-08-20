/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export const fieldWrapperTs = `import React from 'react';

import './field-wrapper.css';

interface FieldWrapperProps {
  required?: boolean;
  title?: string;
  children?: React.ReactNode;
  error?: string;
  note?: string;
}

export const FieldWrapper = ({ required, title, children, error, note }: FieldWrapperProps) => (
  <div className="field-wrapper">
    <div className="field-title">
      {title}
      {note ? <p className="field-note">{note}</p> : null}
      {required ? <span className="required">*</span> : null}
    </div>
    {children}
    <p className="error-message">{error}</p>
    {note ? <br /> : null}
  </div>
);
`;

export const fieldWrapperCss = `.error-message {
  color: #f5222d !important;
}

.required {
  color: #f5222d !important;
  padding-left: 4px
}

.field-wrapper {
  width: 100%;
  margin-bottom: 12px;
}

.field-title {
  margin-bottom: 6px;
}

.field-note{
  color: #a3a0a0 !important;
  font-size: 12px;
  margin: 6px 0;
}
`;

export const defaultInitialDataTs = `import { WorkflowJSON } from '@flowgram.ai/free-layout-editor';

export const DEFAULT_INITIAL_DATA: WorkflowJSON = {
  nodes: [
    {
      id: 'node_0',
      type: 'custom',
      meta: {
        position: { x: 400, y: 0 },
      },
    },
  ],
  edges: [],
};`;
